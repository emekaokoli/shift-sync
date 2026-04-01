import { toast } from "sonner";

export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '8px',
    },
    description,
  });
}
