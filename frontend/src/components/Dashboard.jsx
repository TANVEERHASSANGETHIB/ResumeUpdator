import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, getCurrentUser } from '../services/supabase'
import { generateBoth } from '../services/api'
import jsPDF from 'jspdf'

export default function Dashboard() {
  const navigate = useNavigate()
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [optimizedResume, setOptimizedResume] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignOut = async () => {
    await signOut()
  }

  const handleGenerate = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please fill in both resume and job description')
      return
    }

    setError('')
    setLoading(true)
    setOptimizedResume('')
    setCoverLetter('')

    try {
      const user = await getCurrentUser()
      const result = await generateBoth(resumeText, jobDescription, user.id)
      
      setOptimizedResume(result.optimized_resume)
      setCoverLetter(result.cover_letter)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const parseMarkdownToPDF = (text, doc, startY) => {
    const lines = text.split('\n')
    let y = startY
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    const lineHeight = 6
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      
      // Check if we need a new page
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      
      // Skip empty lines but add small spacing
      if (!line) {
        y += 3
        continue
      }
      
      // Main heading (bold, larger, centered)
      if (line.startsWith('**') && line.endsWith('**') && i === 0) {
        line = line.replace(/\*\*/g, '')
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        const textWidth = doc.getTextWidth(line)
        const xPos = (doc.internal.pageSize.width - textWidth) / 2
        doc.text(line, xPos, y)
        y += 10
        continue
      }
      
      // Section headers (bold, larger)
      if (line.startsWith('**') && line.endsWith('**')) {
        line = line.replace(/\*\*/g, '')
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(line, margin, y)
        y += 8
        continue
      }
      
      // Bold text (job titles, company names)
      if (line.startsWith('**') || line.includes('**')) {
        line = line.replace(/\*\*/g, '')
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        const wrappedText = doc.splitTextToSize(line, doc.internal.pageSize.width - 2 * margin)
        doc.text(wrappedText, margin, y)
        y += wrappedText.length * lineHeight
        continue
      }
      
      // Bullet points
      if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('+ ')) {
        line = line.substring(2)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.circle(margin + 2, y - 1, 0.8, 'F')
        const wrappedText = doc.splitTextToSize(line, doc.internal.pageSize.width - 2 * margin - 10)
        doc.text(wrappedText, margin + 8, y)
        y += wrappedText.length * lineHeight
        continue
      }
      
      // Sub-bullets (nested with tabs or multiple spaces)
      if (line.startsWith('\t+') || line.startsWith('  +') || line.startsWith('\t-') || line.startsWith('  -')) {
        line = line.replace(/^[\t\s]+[+-]\s*/, '')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.circle(margin + 10, y - 1, 0.6, 'F')
        const wrappedText = doc.splitTextToSize(line, doc.internal.pageSize.width - 2 * margin - 18)
        doc.text(wrappedText, margin + 16, y)
        y += wrappedText.length * lineHeight
        continue
      }
      
      // Regular text
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const wrappedText = doc.splitTextToSize(line, doc.internal.pageSize.width - 2 * margin)
      doc.text(wrappedText, margin, y)
      y += wrappedText.length * lineHeight
    }
    
    return y
  }

  const handleDownloadPDF = (content, filename, title) => {
    try {
      const doc = new jsPDF()
      
      // Add title at top
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(128, 0, 128) // Purple color
      const titleWidth = doc.getTextWidth(title)
      const xPos = (doc.internal.pageSize.width - titleWidth) / 2
      doc.text(title, xPos, 15)
      
      // Add a line under title
      doc.setDrawColor(128, 0, 128)
      doc.setLineWidth(0.5)
      doc.line(20, 18, doc.internal.pageSize.width - 20, 18)
      
      // Parse and add content
      parseMarkdownToPDF(content, doc, 28)
      
      // Add footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }
      
      doc.save(filename)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Animated Header */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 animate-fadeInLeft">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ResumeAI
              </h1>
            </div>
            <div className="flex gap-3 animate-fadeInRight">
              <button
                onClick={() => navigate('/history')}
                className="px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fadeInUp">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Perfect Application
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let AI optimize your resume and generate a compelling cover letter tailored to any job
          </p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Resume Input */}
          <div className="group animate-fadeInLeft">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-100 hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Resume
                </h2>
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full min-h-[350px] px-5 py-4 bg-white/50 border-2 border-purple-100 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none backdrop-blur-sm"
                placeholder="Paste your resume here...

Example:
John Doe
Software Engineer

EXPERIENCE
- Company Name (2020-2023)
- Led development of...

SKILLS
- JavaScript, React, Node.js
- ..."
              />
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Characters: {resumeText.length}</span>
              </div>
            </div>
          </div>

          {/* Job Description Input */}
          <div className="group animate-fadeInRight">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-pink-100 hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Job Description
                </h2>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full min-h-[350px] px-5 py-4 bg-white/50 border-2 border-pink-100 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none backdrop-blur-sm"
                placeholder="Paste the job description here...

Example:
Senior Software Engineer

We are looking for an experienced engineer to:
- Build scalable web applications
- Lead technical initiatives
- Mentor junior developers

Requirements:
- 5+ years of experience
- Strong knowledge of React...
"
              />
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Characters: {jobDescription.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-12 animate-fadeInUp animation-delay-200">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center gap-3">
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating Magic...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Resume & Cover Letter
                </>
              )}
            </span>
          </button>
          
          {loading && (
            <p className="mt-4 text-gray-600 animate-pulse">
              ⏱️ This may take up to 3 minutes. Please be patient...
            </p>
          )}
          
          {error && (
            <div className="mt-6 inline-block bg-red-50 border-2 border-red-200 text-red-600 px-6 py-4 rounded-2xl animate-shake shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {(optimizedResume || coverLetter) && (
          <div className="grid md:grid-cols-2 gap-8 animate-fadeInUp">
            {/* Optimized Resume */}
            {optimizedResume && (
              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-100 hover:shadow-3xl transition-all duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Optimized Resume
                      </h2>
                    </div>
                    <button
                      onClick={() => handleDownloadPDF(optimizedResume, 'optimized_resume.pdf', 'Optimized Resume')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 max-h-[500px] overflow-y-auto border border-purple-100 custom-scrollbar">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                      {optimizedResume}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Cover Letter */}
            {coverLetter && (
              <div className="group">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-pink-100 hover:shadow-3xl transition-all duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Cover Letter
                      </h2>
                    </div>
                    <button
                      onClick={() => handleDownloadPDF(coverLetter, 'cover_letter.pdf', 'Cover Letter')}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 max-h-[500px] overflow-y-auto border border-blue-100 custom-scrollbar">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                      {coverLetter}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}