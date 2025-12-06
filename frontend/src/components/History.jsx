import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, signOut } from '../services/supabase'
import { getHistory, deleteOptimization } from '../services/api'
import jsPDF from 'jspdf'

export default function History() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const user = await getCurrentUser()
      const result = await getHistory(user.id)
      setHistory(result.history || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this optimization?')) {
      return
    }

    try {
      await deleteOptimization(id)
      setHistory(history.filter(item => item.id !== id))
      if (selectedItem?.id === id) {
        setSelectedItem(null)
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message)
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

  const handleSignOut = async () => {
    await signOut()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  History
                </h1>
                <p className="text-sm text-gray-600">View your past optimizations</p>
              </div>
            </div>
            <div className="flex gap-3 animate-fadeInRight">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeInUp">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-pink-400 rounded-full animate-spin animation-delay-150"></div>
            </div>
            <p className="mt-6 text-xl text-gray-600 font-medium">Loading your history...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 px-8 py-6 rounded-3xl shadow-lg animate-shake">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 animate-fadeInUp">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl mb-6 shadow-xl">
              <svg
                className="w-14 h-14 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">No History Yet</h3>
            <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Start by generating your first resume optimization to see it here
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Create Your First One
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* History List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between mb-6 animate-fadeInLeft">
                <h2 className="text-2xl font-bold text-gray-900">
                  Past Optimizations
                </h2>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg">
                  {history.length}
                </span>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-2">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group cursor-pointer transition-all duration-300 animate-fadeInLeft ${
                      selectedItem?.id === item.id
                        ? 'scale-105'
                        : 'hover:scale-102'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-6 border-2 transition-all duration-300 ${
                      selectedItem?.id === item.id
                        ? 'border-purple-500 shadow-2xl bg-gradient-to-br from-purple-50 to-pink-50'
                        : 'border-transparent hover:border-purple-200 hover:shadow-xl'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(item.created_at)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id)
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                        {item.job_description?.substring(0, 120)}...
                      </p>
                      {selectedItem?.id === item.id && (
                        <div className="mt-3 flex items-center gap-2 text-purple-600 font-semibold text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-2">
              {selectedItem ? (
                <div className="space-y-6 animate-fadeInRight">
                  {/* Job Description */}
                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-100 transform hover:scale-[1.01] transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Job Description
                      </h3>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 max-h-[250px] overflow-y-auto border border-blue-100 custom-scrollbar">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                        {selectedItem.job_description}
                      </pre>
                    </div>
                  </div>

                  {/* Optimized Resume */}
                  {selectedItem.optimized_resume && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-100 transform hover:scale-[1.01] transition-all duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            Optimized Resume
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            handleDownloadPDF(
                              selectedItem.optimized_resume,
                              `resume_${selectedItem.id}.pdf`,
                              'Optimized Resume'
                            )
                          }
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 max-h-[450px] overflow-y-auto border border-purple-100 custom-scrollbar">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                          {selectedItem.optimized_resume}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Cover Letter */}
                  {selectedItem.cover_letter && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-pink-100 transform hover:scale-[1.01] transition-all duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            Cover Letter
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            handleDownloadPDF(
                              selectedItem.cover_letter,
                              `cover_letter_${selectedItem.id}.pdf`,
                              'Cover Letter'
                            )
                          }
                          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>
                      </div>
                      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 max-h-[450px] overflow-y-auto border border-pink-100 custom-scrollbar">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                          {selectedItem.cover_letter}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-12 h-full flex items-center justify-center border border-purple-100 animate-fadeInRight">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl mb-6 shadow-xl">
                      <svg
                        className="w-12 h-12 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Select an Item</h3>
                    <p className="text-gray-600">Click on any history item to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}