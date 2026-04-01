import { toast } from "sonner";

export function showSuccessToast(message: string) {
  toast.success(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '8px',
    },
  });
}
