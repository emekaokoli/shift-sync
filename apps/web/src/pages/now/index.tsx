import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentShifts } from '@/hooks/shifts';
import { useLocations } from '@/hooks/locations';
import { Clock, MapPin, Users } from 'lucide-react';
import { useState } from 'react';
import dayjs from 'dayjs';

interface CurrentShift {
  id: string;
  location_id: string;
  location_name: string;
  timezone: string;
  start_time: string;
  end_time: string;
  status: string;
  headcount: number;
  required_skill_name: string;
  assignedStaff: { userId: string; userName: string; userEmail: string }[];
}

export function CurrentShifts() {
  const { data: locations } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  
  const locationId = selectedLocation === 'all' ? undefined : selectedLocation;
  const { data: shifts, isLoading } = useCurrentShifts(locationId);
  
  const currentShifts = shifts as CurrentShift[] | undefined;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (time: string) => {
    return dayjs(time).format('h:mm A');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">On-Duty Now</h1>
          <p className="text-muted-foreground">Currently active shifts</p>
        </div>
        
        <Select
          value={selectedLocation}
          onValueChange={(value) => setSelectedLocation(value ?? 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((loc: { id: string; name: string }) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : !currentShifts || currentShifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No active shifts</p>
            <p className="text-muted-foreground">There are no shifts currently in progress</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {currentShifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">{shift.location_name}</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {shift.required_skill_name}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {shift.assignedStaff.length}/{shift.headcount} staff
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shift.assignedStaff.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {shift.assignedStaff.map((staff) => (
                      <div
                        key={staff.userId}
                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(staff.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{staff.userName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No staff assigned</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
