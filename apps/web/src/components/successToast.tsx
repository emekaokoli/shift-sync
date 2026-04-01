import { toast } from "sonner";

export function SuccessToast({message}:{message:string}) {
  return (
    toast.success(`${message}`, {
      position: 'top-right',
      duration: 3000,
      style: {
        background: '#10b981',
        color: '#fff',
        borderRadius: '8px',
      }
    })
  )
}