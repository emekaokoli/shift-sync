import { toast } from "sonner";

export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#ef4444',
      color: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    },
    description,
  });
}
