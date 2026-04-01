import { toast } from "sonner"

export const showError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    position: 'top-right',
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    },
  })
}

export const showSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    },
  })
}

export const showInfo = (message: string, description?: string) => {
  toast(message, { 
    description,
    position: 'top-right',
    duration: 3000,
  })
}