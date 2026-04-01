import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Schedule } from "@/pages/schedules"
import { MyShifts } from "@/pages/shifts"
import { Swaps } from "@/pages/swaps/swaps"
import { useLocation, useNavigate } from "@tanstack/react-router"

export function Home() {
  const navigate = useNavigate({ from: '/' })
  const location = useLocation()
  const tab = new URLSearchParams(location.search).get('tab') || 'schedule'

  const handleTabChange = (value: string) => {
    navigate({ to: '/', search: { tab: value } })
  }

  return (
    <div className="container flex flex-col justify-center items-center p-8 w-full">
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="my-shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="swaps">Swaps</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <Schedule />
        </TabsContent>
        <TabsContent value="my-shifts">
          <MyShifts />
        </TabsContent>
        <TabsContent value="swaps">
          <Swaps />
        </TabsContent>
      </Tabs>
    </div>
  )
}