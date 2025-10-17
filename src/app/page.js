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
  };

  const parseResume = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // Extract basic info (name, email, phone, links)
    const email = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || "";
    const phone =
      text.match(
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
      )?.[0] || "";

    // Extract name - usually the first line that's in all caps and reasonable length
    let name = "";
    for (const line of lines) {
      if (
        line.length > 2 &&
        line.length < 50 &&
        line === line.toUpperCase() &&
        /^[A-Z\s]+$/.test(line)
      ) {
        name = line;
        break;
      }
    }

    // Extract links
    const links = {
      linkedin: text.match(/linkedin\.com\/[^\s]+/i)?.[0] || "",
      github: text.match(/github\.com\/[^\s]+/i)?.[0] || "",
      portfolio:
        text.match(/(portfolio|website)[^\n]*[:\s]*([^\s]+)/i)?.[2] || "",
    };

    // Improved section extraction
    const getSection = (headers, includeSubsections = false) => {
      for (const h of headers) {
        const regex = new RegExp(
          `${h}[\\s\\S]*?(?=\\n\\s*\\n|\\n[A-Z][A-Za-z\\s]+:|$)`,
          "i"
        );
        const match = text.match(regex);
        if (match) {
          let content = match[0].replace(new RegExp(`^${h}`, "i"), "").trim();

          if (!includeSubsections) {
            // Remove subsection headers
            content = content.replace(/\n[A-Z][A-Za-z\s]+:/g, "");
          }

          return content;
        }
      }
      return "";
    };

    // Parse Skills section with better handling
    const skillSection = getSection([
      "SKILLS",
      "TECHNICAL SKILLS",
      "TECHNICAL SKILLS:",
    ]);
    const skills = new Set();

    if (skillSection) {
      // Handle categorized skills (Frontend:, Backend:, etc.)
      const categoryLines = skillSection
        .split("\n")
        .filter((line) => line.includes(":"));

      if (categoryLines.length > 0) {
        categoryLines.forEach((line) => {
          const [_, skillList] = line.split(":");
          if (skillList) {
            skillList
              .split(/[,|]/)
              .map((s) => s.trim())
              .filter((s) => s && s.length > 1)
              .forEach((skill) => skills.add(skill));
          }
        });
      } else {
        // Handle plain list of skills
        skillSection
          .split(/[,|•\-]/)
          .map((s) => s.trim())
          .filter((s) => s && s.length > 1 && !s.includes(":"))
          .forEach((skill) => skills.add(skill));
      }
    }

    // Parse Experience section with improved structure detection
    const expSection = getSection([
      "EXPERIENCE",
      "WORK EXPERIENCE",
      "WORK HISTORY",
    ]);
    const experience = [];

    if (expSection) {
      const expBlocks = expSection
        .split(/\n\s*\n/)
        .filter((block) => block.trim());

      expBlocks.forEach((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);

        if (lines.length < 2) return;

        // Look for job title pattern
        let title = "";
        let company = "";
        let period = "";
        let desc = [];

        // First line typically contains title and company
        const firstLine = lines[0];

        // Extract period
        const periodMatch = firstLine.match(
          /(\d{1,2}\/\d{4}\s*[–-]\s*(present|current|\d{1,2}\/\d{4}))/i
        );
        if (periodMatch) {
          period = periodMatch[0];
        }

        // Extract title and company
        const cleanFirstLine = firstLine
          .replace(period, "")
          .replace(/\|/g, "")
          .trim();
        const titleCompanyParts = cleanFirstLine
          .split(/\s{2,}/)
          .filter((p) => p);

        if (titleCompanyParts.length >= 2) {
          title = titleCompanyParts[0];
          company = titleCompanyParts[1];
        } else if (titleCompanyParts.length === 1) {
          title = titleCompanyParts[0];
        }

        // Remaining lines are description/bullet points
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (
            line.startsWith("•") ||
            line.startsWith("-") ||
            line.match(/^[●·◦]/)
          ) {
            const cleanDesc = line.replace(/^[•\-●·◦]\s*/, "").trim();
            if (cleanDesc) desc.push(cleanDesc);
          } else if (line.length > 10 && !line.match(/^\d/)) {
            // Handle lines without bullet points but still descriptive
            desc.push(line);
          }
        }

        if (title || company) {
          experience.push({
            title: title || "Professional Role",
            company: company || "",
            period: period || "",
            desc: desc,
          });
        }
      });
    }

    // Parse Education section
    const eduSection = getSection(["EDUCATION", "ACADEMIC BACKGROUND"]);
    const education = [];

    if (eduSection) {
      const eduBlocks = eduSection
        .split(/\n\s*\n/)
        .filter((block) => block.trim());

      eduBlocks.forEach((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);

        if (lines.length === 0) return;

        let degree = "";
        let school = "";
        let year = "";
        let location = "";

        // First line typically contains degree
        degree = lines[0];

        // Look for year
        const yearMatch = block.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) year = yearMatch[0];

        // Second line often contains school and location
        if (lines.length > 1) {
          const schoolLine = lines[1];
          // Simple heuristic: if it contains common location indicators
          if (schoolLine.match(/\b(University|College|Institute|School)\b/i)) {
            school = schoolLine;
          }
        }

        // Look for location in subsequent lines
        for (let i = 2; i < lines.length; i++) {
          if (lines[i].match(/[A-Z][a-z]+/)) {
            location = lines[i];
            break;
          }
        }

        if (degree || school) {
          education.push({
            degree: degree || "",
            school: school || "",
            year: year || "",
            location: location || "",
          });
        }
      });
    }

    // Parse Projects section if present
    const projectsSection = getSection(["PROJECTS", "PERSONAL PROJECTS"]);
    const projects = [];

    if (projectsSection) {
      const projectBlocks = projectsSection
        .split(/\n\s*\n/)
        .filter((block) => block.trim());

      projectBlocks.forEach((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l);
        if (lines.length < 2) return;

        const project = {
          name: lines[0].replace(/[•\-●·◦]\s*/, "").trim(),
          description: [],
        };

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].startsWith("•") || lines[i].startsWith("-")) {
            project.description.push(lines[i].replace(/^[•\-]\s*/, "").trim());
          }
        }

        projects.push(project);
      });
    }

    return {
      info: {
        name,
        email,
        phone,
        links,
      },
      skills: Array.from(skills).slice(0, 15),
      experience,
      education,
      projects,
    };
  };

  const handleUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") return setError("PDF only");
    if (!ready) return setError("Loading...");

    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const text = await extractTextFromPDF(f);
      const parsed = parseResume(text);
      setData({ ...parsed, raw: text, fileName: f.name });
    } catch (err) {
      setError("Failed to parse PDF");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.fileName.replace(".pdf", "")}.json`;
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
              className="bg-blue-800 text-white px-6 py-2 rounded mb-6 font-bold hover:bg-blue-900"
            >
              Back
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
                />
              </div>

              <div>
                <label className="block font-bold mb-2 text-black">
                  Resume
                </label>
                <label
                  className={`block border border-gray-300 rounded px-4 py-2 text-center text-black ${
                    ready ? "cursor-pointer hover:bg-gray-50" : "opacity-50"
                  }`}
                >
                  {file ? file.name : "Click to upload a resume"}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={!ready}
                  />
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {loading && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-black">Parsing resume...</p>
                </div>
              )}

              {data && !loading && (
                <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">
                    Resume uploaded successfully
                  </span>
                </div>
              )}

              <button
                onClick={() => data && setPage("profile")}
                disabled={!data || !formData.fullName || !formData.email}
                className={`w-full py-3 rounded font-bold ${
                  data && formData.fullName && formData.email
                    ? "bg-blue-800 text-white hover:bg-blue-900"
                    : "bg-gray-300 text-black cursor-not-allowed"
                }`}
              >
                Submit Application
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
              <div className="w-24 h-24 border-2 border-black rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12"
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
                <div className="flex flex-wrap gap-4 text-sm text-black mb-2">
                  {data.info.email && <span>{data.info.email}</span>}
                  {data.info.phone && <span>{data.info.phone}</span>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-blue-600">
                  {data.info.links.linkedin && (
                    <span>LinkedIn: {data.info.links.linkedin}</span>
                  )}
                  {data.info.links.github && (
                    <span>GitHub: {data.info.links.github}</span>
                  )}
                  {data.info.links.portfolio && (
                    <span>Portfolio: {data.info.links.portfolio}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* About Me Section */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-black">About Me</h3>
                <p className="text-black text-sm">
                  {data.experience.length > 0
                    ? `Experienced ${
                        data.experience[0]?.title || "professional"
                      } with expertise in ${data.skills
                        .slice(0, 3)
                        .join(", ")}.`
                    : "Write a short professional bio (e.g., skills, experience, interests)"}
                </p>
              </div>

              {/* Skills Section */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-black">Skills</h3>
                {data.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-black">
                      Add Skills (e.g. Project Management)
                    </p>
                    <button className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Experience Section */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-black">
                  Experience
                </h3>
                {data.experience.length > 0 ? (
                  <div className="space-y-6">
                    {data.experience.map((exp, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-blue-500 pl-4 py-2"
                      >
                        <h4 className="font-semibold text-lg text-black">
                          {exp.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-1">
                          {exp.company} {exp.period && `| ${exp.period}`}
                        </p>
                        {exp.desc && exp.desc.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {exp.desc.map((bullet, bulletIndex) => (
                              <li
                                key={bulletIndex}
                                className="text-sm text-black flex items-start"
                              >
                                <span className="mr-2">•</span>
                                <span>{bullet}</span>
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
                <h3 className="text-lg font-bold mb-3 text-black">Education</h3>
                {data.education.length > 0 ? (
                  <div className="space-y-4">
                    {data.education.map((edu, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-green-500 pl-4 py-1"
                      >
                        <h4 className="font-semibold text-black">
                          {edu.degree}
                        </h4>
                        <p className="text-sm text-black">{edu.school}</p>
                        <p className="text-sm text-gray-600">
                          {edu.year} {edu.location && `| ${edu.location}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-black">
                    <p>Add School (e.g. Boston University)</p>
                    <p>Add Degree (e.g. Bachelor&apos;s)</p>
                    <p>Add Field of Study (e.g. Business)</p>
                    <p>Add Your Starting Date</p>
                    <p>Add Ending Date (or expected)</p>
                  </div>
                )}
              </div>

              {/* Projects Section */}
              {data.projects && data.projects.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-black">
                    Projects
                  </h3>
                  <div className="space-y-4">
                    {data.projects.map((project, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-purple-500 pl-4 py-1"
                      >
                        <h4 className="font-semibold text-black">
                          {project.name}
                        </h4>
                        {project.description.length > 0 && (
                          <ul className="mt-1 space-y-1">
                            {project.description.map((desc, descIndex) => (
                              <li
                                key={descIndex}
                                className="text-sm text-black flex"
                              >
                                <span className="mr-2">•</span>
                                <span>{desc}</span>
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold mb-4 text-black">Settings</h3>
            <p className="text-sm text-black mb-2 cursor-pointer hover:text-blue-600">
              Close My Account
            </p>
            <p className="text-sm text-black cursor-pointer hover:text-blue-600">
              Manage Notifications
            </p>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setPage("job")}
              className="flex items-center gap-2 border-2 border-gray-300 px-6 py-2 rounded hover:bg-gray-50 text-black"
            >
              <ArrowLeft className="w-4 h-4 text-black" /> Back to Jobs
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 border-2 border-gray-300 px-6 py-2 rounded hover:bg-gray-50 text-black"
            >
              <Download className="w-4 h-4 text-black" /> Download Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
