const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const generateBoth = async (resumeText, jobDescription, userId) => {
  const response = await fetch(`${API_BASE_URL}/api/generate-both`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jobDescription,
      user_id: userId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate documents')
  }

  return response.json()
}

export const getHistory = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/${userId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch history')
  }

  return response.json()
}

export const deleteOptimization = async (optimizationId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/${optimizationId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete optimization')
  }

  return response.json()
}