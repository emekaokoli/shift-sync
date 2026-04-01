import { toast } from "sonner";


export function ErrorToast({ message, description, actionLabel, onRetry, duration = 3000 }: { message: string; description?: string; actionLabel?: string; onRetry?: () => void; duration?: number }) {

  return (
    toast.error(`${message}`, {
      position: 'top-right',
      duration: duration,
      style: {
        background: '#f87171',
        color: '#fff',
        borderRadius: '8px',
      },
      description,
      action: {
        label: actionLabel,
        onClick: () => {
          onRetry?.();
        },
      },
    })
  )
}
