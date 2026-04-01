import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/unauthorized')({
  component: () =>{
    return <div>You are not authorized to view this page.</div>
  },
})