import { toast } from "sonner";

export function showSuccessToast(message: string) {
  toast.success(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    },
  });
}
