/* eslint-disable react/no-unescaped-entities */

"use client";
import { useState, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Download,
} from "lucide-react";

export default function JobApplicationPlatform() {
  const [page, setPage] = useState("job");
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      if (window["pdfjs-dist/build/pdf"]) {
        window["pdfjs-dist/build/pdf"].GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setReady(true);
      }
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const extractTextFromPDF = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await window["pdfjs-dist/build/pdf"].getDocument({
        data: buffer,
      }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }
      return text.trim();
    } catch (err) {
      console.error("PDF extraction error:", err);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const parseResume = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // Extract basic info with improved patterns
    const email = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || "";

    // Improved phone number matching
    const phoneMatch = text.match(
      /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    );
    const phone = phoneMatch ? phoneMatch[0] : "";

    // Extract name - improved pattern matching
    let name = "";
    for (const line of lines) {
      if (
        line.length > 2 &&
        line.length < 50 &&
        (line === line.toUpperCase() ||
          /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(line)) &&
        !line.includes("@") &&
        !line.includes("github") &&
        !line.includes("linkedin")
      ) {
        name = line;
        break;
      }
    }

    // If no name found with uppercase pattern, try first non-empty line
    if (!name && lines.length > 0) {
      name = lines[0];
    }

    // Extract links with improved patterns
    const links = {
      linkedin:
        text.match(
          /(?:linkedin\.com\/[^\s]+|LinkedIn[^\n]*[:\s]*([^\s]+))/i
        )?.[0] || "",
      github:
        text.match(
          /(?:github\.com\/[^\s]+|GitHub[^\n]*[:\s]*([^\s]+))/i
        )?.[0] || "",
      portfolio:
        text.match(/(?:portfolio|website)[^\n]*[:\s]*([^\s]+)/i)?.[1] || "",
    };

    // Improved section extraction
    const getSection = (headers, maxLines = 50) => {
      for (const h of headers) {
        const headerIndex = text.toLowerCase().indexOf(h.toLowerCase());
        if (headerIndex !== -1) {
          let sectionStart = headerIndex + h.length;
          let sectionEnd = text.length;

          // Find the next major section
          const nextSections = [
            "EXPERIENCE",
            "EDUCATION",
            "PROJECTS",
            "SKILLS",
            "CERTIFICATIONS",
            "AWARDS",
            "CONTACT",
            "REFERENCES",
          ];

          for (const nextSection of nextSections) {
            if (nextSection.toLowerCase() !== h.toLowerCase()) {
              const nextIndex = text
                .toLowerCase()
                .indexOf(nextSection.toLowerCase(), sectionStart);
              if (nextIndex !== -1 && nextIndex < sectionEnd) {
                sectionEnd = nextIndex;
              }
            }
          }

          const content = text.slice(sectionStart, sectionEnd).trim();
          return content.split("\n").slice(0, maxLines).join("\n");
        }
      }
      return "";
    };

    // Parse Skills section with improved handling
    const skillSection = getSection(["SKILLS", "TECHNICAL SKILLS"]);
    const skills = new Set();

    if (skillSection) {
      // Split by lines and process each line
      const skillLines = skillSection.split("\n").filter((line) => line.trim());

      skillLines.forEach((line) => {
        // Remove category labels and process the actual skills
        const cleanLine = line.replace(
          /^(Frontend|Backend|Languages|Tools|Technologies)[:\s]*/i,
          ""
        );

        // Split by common separators
        const lineSkills = cleanLine
          .split(/[,|•\-·]|:\s*/)
          .map((s) => s.trim())
          .filter(
            (s) =>
              s &&
              s.length > 1 &&
              !s.match(/^(Frontend|Backend|Languages|Tools|Technologies)$/i)
          );

        lineSkills.forEach((skill) => skills.add(skill));
      });
    }

    // Parse Experience section with improved structure
    const expSection = getSection([
      "EXPERIENCE",
      "WORK EXPERIENCE",
      "WORK HISTORY",
    ]);
    const experience = [];

    if (expSection) {
      const lines = expSection.split("\n").filter((l) => l.trim());
      let currentExp = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Look for job title pattern (often at start of line, may have company and date)
        if (
          line.match(
            /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*(?:Developer|Engineer|Specialist|Manager|Intern)/i
          )
        ) {
          // If we have a previous experience, save it
          if (currentExp && (currentExp.title || currentExp.company)) {
            experience.push(currentExp);
          }

          currentExp = {
            title: "",
            company: "",
            period: "",
            desc: [],
          };

          // Extract period
          const periodMatch = line.match(
            /(\d{1,2}\/\d{4}\s*[–\-]\s*(?:present|current|\d{1,2}\/\d{4}))/i
          );
          if (periodMatch) {
            currentExp.period = periodMatch[0];
          }

          // Extract title and company
          const cleanLine = line
            .replace(periodMatch ? periodMatch[0] : "", "")
            .trim();
          const parts = cleanLine.split(/\s{2,}|\|/).filter((p) => p.trim());

          if (parts.length >= 2) {
            currentExp.title = parts[0];
            currentExp.company = parts
              .slice(1)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          } else if (parts.length === 1) {
            currentExp.title = parts[0];
          }
        }
        // Look for bullet points or descriptions
        else if (
          currentExp &&
          (line.startsWith("•") ||
            line.startsWith("-") ||
            line.match(/^[●·◦]/) ||
            line.length > 20)
        ) {
          const cleanDesc = line.replace(/^[•\-●·◦]\s*/, "").trim();
          if (cleanDesc && !cleanDesc.match(/(present|current|\d{4})/i)) {
            currentExp.desc.push(cleanDesc);
          }
        }
        // Company name might be on next line
        else if (
          currentExp &&
          !currentExp.company &&
          line.match(/[A-Z][a-zA-Z\s&]+/)
        ) {
          currentExp.company = line.trim();
        }
      }

      // Don't forget the last experience
      if (currentExp && (currentExp.title || currentExp.company)) {
        experience.push(currentExp);
      }
    }

    // Parse Education section
    const eduSection = getSection(["EDUCATION", "ACADEMIC BACKGROUND"]);
    const education = [];

    if (eduSection) {
      const lines = eduSection.split("\n").filter((l) => l.trim());
      let currentEdu = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Look for degree patterns
        if (
          line.match(
            /(B\.Tech|B\.E|B\.S|M\.Tech|M\.S|Bachelor|Master|Diploma)/i
          )
        ) {
          if (currentEdu) {
            education.push(currentEdu);
          }

          currentEdu = {
            degree: line.trim(),
            school: "",
            year: "",
            location: "",
          };
        }
        // Look for school names
        else if (
          currentEdu &&
          !currentEdu.school &&
          line.match(/(University|College|Institute|School|Academy)/i)
        ) {
          currentEdu.school = line.trim();
        }
        // Look for year
        else if (currentEdu && !currentEdu.year) {
          const yearMatch = line.match(/(19|20)\d{2}/);
          if (yearMatch) {
            currentEdu.year = yearMatch[0];
          }
        }
        // Look for location (usually shorter text)
        else if (
          currentEdu &&
          !currentEdu.location &&
          line.length < 30 &&
          line.match(/[A-Z][a-z]+/)
        ) {
          currentEdu.location = line.trim();
        }
      }

      if (currentEdu) {
        education.push(currentEdu);
      }
    }

    // Parse Projects section
    const projectsSection = getSection(["PROJECTS", "PERSONAL PROJECTS"]);
    const projects = [];

    if (projectsSection) {
      const lines = projectsSection.split("\n").filter((l) => l.trim());
      let currentProject = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Project names often start the line, might have icons or bold formatting indicators
        if (
          line.match(/[A-Z][A-Za-z\s]+(?:\s*🔴)?$/) &&
          line.length < 100 &&
          !line.startsWith("•") &&
          !line.startsWith("-")
        ) {
          if (currentProject) {
            projects.push(currentProject);
          }

          currentProject = {
            name: line.replace(/🔴$/, "").trim(),
            description: [],
          };
        }
        // Project descriptions
        else if (
          currentProject &&
          (line.startsWith("•") ||
            line.startsWith("-") ||
            line.match(/^[●·◦]/) ||
            line.length > 10)
        ) {
          const cleanDesc = line.replace(/^[•\-●·◦]\s*/, "").trim();
          if (cleanDesc) {
            currentProject.description.push(cleanDesc);
          }
        }
        // Tech stack might be mentioned
        else if (currentProject && line.match(/Tech Stack:/i)) {
          currentProject.description.push(line);
        }
      }

      if (currentProject) {
        projects.push(currentProject);
      }
    }

    return {
      info: {
        name,
        email,
        phone,
        links,
      },
      skills: Array.from(skills).slice(0, 20), // Increased limit for better coverage
      experience,
      education,
      projects,
      rawText: text, // Keep original text for debugging
    };
  };

  const handleUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== "application/pdf")
      return setError("Please upload a PDF file only");
    if (!ready) return setError("PDF parser is still loading...");

    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const text = await extractTextFromPDF(f);
      console.log("Extracted text:", text); // For debugging
      const parsed = parseResume(text);
      console.log("Parsed data:", parsed); // For debugging
      setData({ ...parsed, fileName: f.name });
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to parse PDF. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.fileName.replace(".pdf", "")}_parsed.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Job Listing Page
  if (page === "job") {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-300 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-black">VOSSVIO</h1>
          </div>
          <button className="bg-blue-800 text-white px-6 py-2 rounded font-medium hover:bg-blue-900">
            Logout
          </button>
        </header>

        <div className="max-w-7xl mx-auto p-8 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-400 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Software Developer
                  </h2>
                  <p className="text-black">Full-Time - Entry Level - Remote</p>
                </div>
              </div>
              <p className="text-sm text-black mb-6">Posted A Few Days Ago</p>
              <button
                onClick={() => setPage("apply")}
                className="bg-blue-800 text-white px-8 py-3 rounded font-bold hover:bg-blue-900"
              >
                Apply
              </button>

              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 text-black">
                  Job Description
                </h3>
                <p className="text-black mb-4">
                  As a software developer at Quivaro, you will have the
                  opportunity to work with a diverse and talented team to
                  develop cutting-edge software solutions. We are looking for
                  someone who is proficient in Java, .NET, Node.js, C++
                  Programming, React, MySQL, HTML, CSS, JavaScript, Python,
                  Software Development Life Cycle (SDLC), software testing,
                  frontend development, backend development, and web
                  development.
                </p>

                <h4 className="font-bold mb-2 text-black">
                  Key Responsibilities:
                </h4>
                <ol className="text-black space-y-2 mb-4">
                  <li>
                    1. Collaborate with cross-functional teams to design,
                    develop, and implement software solutions.
                  </li>
                  <li>
                    2. Write clean, maintainable, and efficient code in various
                    programming languages.
                  </li>
                  <li>
                    3. Participate in all phases of the software development
                    life cycle.
                  </li>
                  <li>
                    4. Conduct thorough software testing to ensure quality and
                    reliability.
                  </li>
                  <li>
                    5. Develop frontend and backend components for web
                    applications.
                  </li>
                  <li>
                    6. Stay updated on industry trends and best practices in
                    software development.
                  </li>
                  <li>
                    7. Provide technical support and guidance to team members
                    when needed.
                  </li>
                </ol>

                <p className="text-black">
                  If you are passionate about software development and possess
                  the skills required for this role, we encourage you to apply
                  and become a valuable member of our team at Quivaro.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-400 rounded-full"></div>
              <h3 className="text-xl font-bold text-black">Quivaro</h3>
            </div>
            <h4 className="font-bold mb-2 text-black">About Quivaro</h4>
            <p className="text-black text-sm">
              Quivaro Pro is multifunctional. Need to know your business stats?
              Or maybe keep communicating with your mates? The platform allows
              you to do this and much more.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Apply Page
  if (page === "apply") {
    return (
      <div className="min-h-screen bg-blue-100">
        <header className="bg-white border-b border-gray-300 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-black">VOSSVIO</h1>
          </div>
          <button className="bg-blue-800 text-white px-6 py-2 rounded font-medium hover:bg-blue-900">
            Logout
          </button>
        </header>

        <div className="max-w-7xl mx-auto p-8 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <button
              onClick={() => setPage("job")}
              className="flex items-center gap-2 bg-blue-800 text-white px-6 py-2 rounded mb-6 font-bold hover:bg-blue-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Job
            </button>

            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-400 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Software Developer
                  </h2>
                  <p className="text-black">Full-Time - Entry Level - Remote</p>
                </div>
              </div>

              <p className="text-black mb-4">
                As a software developer at Quivaro, you will have the
                opportunity to work with a diverse and talented team to develop
                cutting-edge software solutions. We are looking for someone who
                is proficient in Java, .NET, Node.js, C++ Programming, React,
                MySQL, HTML, CSS, JavaScript, Python, Software Development Life
                Cycle (SDLC), software testing, frontend development, backend
                development, and web development.
              </p>

              <h4 className="font-bold mb-2 text-black">
                Key Responsibilities:
              </h4>
              <ol className="text-black space-y-1 text-sm">
                <li>
                  1. Collaborate with cross-functional teams to design, develop,
                  and implement software solutions.
                </li>
                <li>
                  2. Write clean, maintainable, and efficient code in various
                  programming languages.
                </li>
                <li>
                  3. Participate in all phases of the software development life
                  cycle.
                </li>
                <li>
                  4. Conduct thorough software testing to ensure quality and
                  reliability.
                </li>
                <li>
                  5. Develop frontend and backend components for web
                  applications.
                </li>
                <li>
                  6. Stay updated on industry trends and best practices in...
                </li>
              </ol>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-6 text-black">
              Apply to Quivaro
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block font-bold mb-2 text-black">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-4 py-2 text-black"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block font-bold mb-2 text-black">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-4 py-2 text-black"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block font-bold mb-2 text-black">
                  Resume (PDF only)
                </label>
                <label
                  className={`block border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
                    ready
                      ? "hover:border-blue-500 hover:bg-blue-50"
                      : "opacity-50 cursor-not-allowed"
                  } ${file ? "border-green-500 bg-green-50" : ""}`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {file ? (
                      <span className="text-green-600 font-medium">
                        {file.name}
                      </span>
                    ) : (
                      "Click to upload your resume (PDF)"
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={!ready}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Upload your resume in PDF format for automatic parsing
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {loading && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-black">Parsing resume...</p>
                </div>
              )}

              {data && !loading && (
                <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">
                    Resume parsed successfully! Found: {data.skills.length}{" "}
                    skills, {data.experience.length} experiences
                  </span>
                </div>
              )}

              <button
                onClick={() => data && setPage("profile")}
                disabled={!data || !formData.fullName || !formData.email}
                className={`w-full py-3 rounded font-bold transition-colors ${
                  data && formData.fullName && formData.email
                    ? "bg-blue-800 text-white hover:bg-blue-900"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {data ? "Review Application" : "Upload Resume to Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile/Results Page
  if (page === "profile" && data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            {/* Basic Info */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 text-black">
                  {formData.fullName || data.info.name || "Candidate"}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                  {data.info.email && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Email:</span>{" "}
                      {data.info.email}
                    </span>
                  )}
                  {data.info.phone && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Phone:</span>{" "}
                      {data.info.phone}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  {data.info.links.linkedin && (
                    <a
                      href={`https://${data.info.links.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      LinkedIn
                    </a>
                  )}
                  {data.info.links.github && (
                    <a
                      href={`https://${data.info.links.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      GitHub
                    </a>
                  )}
                  {data.info.links.portfolio && (
                    <a
                      href={
                        data.info.links.portfolio.startsWith("http")
                          ? data.info.links.portfolio
                          : `https://${data.info.links.portfolio}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* About Me Section */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b pb-2">
                  About Me
                </h3>
                <p className="text-black text-sm leading-relaxed">
                  {data.experience.length > 0
                    ? `Experienced ${
                        data.experience[0]?.title || "professional"
                      } with expertise in ${data.skills
                        .slice(0, 5)
                        .join(", ")}. ${
                        data.experience[0]?.desc?.[0] ||
                        "Skilled in developing innovative solutions and collaborating with cross-functional teams."
                      }`
                    : `Skilled professional with expertise in ${data.skills
                        .slice(0, 5)
                        .join(
                          ", "
                        )}. Passionate about creating efficient and scalable solutions.`}
                </p>
              </div>

              {/* Skills Section */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b pb-2">
                  Skills
                </h3>
                {data.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No skills detected in resume
                  </p>
                )}
              </div>

              {/* Experience Section */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b pb-2">
                  Experience
                </h3>
                {data.experience.length > 0 ? (
                  <div className="space-y-6">
                    {data.experience.map((exp, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-blue-500 pl-4 py-2"
                      >
                        <h4 className="font-semibold text-lg text-black mb-1">
                          {exp.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                          {exp.company && (
                            <span className="font-medium">{exp.company}</span>
                          )}
                          {exp.period && (
                            <>
                              <span>•</span>
                              <span>{exp.period}</span>
                            </>
                          )}
                        </div>
                        {exp.desc && exp.desc.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {exp.desc.map((bullet, bulletIndex) => (
                              <li
                                key={bulletIndex}
                                className="text-sm text-black flex items-start"
                              >
                                <span className="mr-2 text-blue-500">•</span>
                                <span className="leading-relaxed">
                                  {bullet}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No work experience found in resume
                  </p>
                )}
              </div>

              {/* Education Section */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b pb-2">
                  Education
                </h3>
                {data.education.length > 0 ? (
                  <div className="space-y-4">
                    {data.education.map((edu, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-green-500 pl-4 py-2"
                      >
                        <h4 className="font-semibold text-black mb-1">
                          {edu.degree}
                        </h4>
                        <p className="text-sm text-black mb-1">{edu.school}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {edu.year && <span>{edu.year}</span>}
                          {edu.location && (
                            <>
                              {edu.year && <span>•</span>}
                              <span>{edu.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No education information found in resume
                  </p>
                )}
              </div>

              {/* Projects Section */}
              {data.projects && data.projects.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-black border-b pb-2">
                    Projects
                  </h3>
                  <div className="space-y-4">
                    {data.projects.map((project, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-purple-500 pl-4 py-2"
                      >
                        <h4 className="font-semibold text-black mb-2">
                          {project.name}
                        </h4>
                        {project.description.length > 0 && (
                          <ul className="space-y-1">
                            {project.description.map((desc, descIndex) => (
                              <li
                                key={descIndex}
                                className="text-sm text-black flex"
                              >
                                <span className="mr-2 text-purple-500">•</span>
                                <span className="leading-relaxed">{desc}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-bold mb-4 text-black">Application Status</h3>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-black">Resume successfully parsed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-black">Application form completed</span>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setPage("apply")}
              className="flex items-center gap-2 border-2 border-gray-300 px-6 py-2 rounded hover:bg-gray-50 text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Application
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Parsed Data
            </button>
            <button
              onClick={() => setPage("job")}
              className="flex items-center gap-2 border-2 border-gray-300 px-6 py-2 rounded hover:bg-gray-50 text-black transition-colors"
            >
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
