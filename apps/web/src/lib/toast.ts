import { toast } from "sonner"

export const showError = (message: string, description?: string) => {
  toast.error(message, { 
    description,
    position: 'top-right',
    duration: 4000,
  })
}

export const showSuccess = (message: string, description?: string) => {
  toast.success(message, { 
    description,
    position: 'top-right',
    duration: 3000,
  })
}

export const showInfo = (message: string, description?: string) => {
  toast(message, { 
    description,
    position: 'top-right',
    duration: 3000,
  })
}