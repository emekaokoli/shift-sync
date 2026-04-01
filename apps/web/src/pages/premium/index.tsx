import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePremiumStats } from '@/hooks/shifts';
import { useLocations } from '@/hooks/locations';
import { useState } from 'react';
import { Star } from 'lucide-react';

interface PremiumStaffStats {
  staffId: string;
  staffName: string;
  premiumShiftCount: number;
  totalHours: number;
}

export function PremiumAnalytics() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  });

  const { data: locations } = useLocations();
  const { data: premiumData, isLoading } = usePremiumStats({
    locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
    startDate: selectedWeek,
    endDate: new Date(new Date(selectedWeek).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const stats = (premiumData as PremiumStaffStats[] | undefined) || [];
  
  const totalPremiumShifts = stats.reduce((sum, s) => sum + s.premiumShiftCount, 0);
  const topPerformers = stats.filter(s => s.premiumShiftCount > 0).slice(0, 3);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Premium Analytics</h1>
        <p className="text-muted-foreground">Track premium shift distribution across staff</p>
      </div>

      <div className="flex gap-4 items-center">
        <select
          className="border rounded px-3 py-2 w-48"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="all">All Locations</option>
          {locations?.map((loc) => {
            const location = loc as { id: string; name: string };
            return (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            );
          })}
        </select>

        <input
          type="date"
          className="border rounded px-3 py-2"
          value={selectedWeek.split('T')[0]}
          onChange={(e) => setSelectedWeek(new Date(e.target.value).toISOString())}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Premium Shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPremiumShifts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Staff with Premium</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{topPerformers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Performer</CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{topPerformers[0].staffName}</span>
                <Badge variant="secondary">{topPerformers[0].premiumShiftCount} shifts</Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premium Shift Distribution</CardTitle>
          <CardDescription>Premium shifts per staff member this week</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : stats.length === 0 ? (
            <p className="text-muted-foreground">No premium shift data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Premium Shifts</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((staff) => (
                  <TableRow key={staff.staffId}>
                    <TableCell className="font-medium">{staff.staffName}</TableCell>
                    <TableCell>{staff.premiumShiftCount}</TableCell>
                    <TableCell>{staff.totalHours.toFixed(1)}h</TableCell>
                    <TableCell>
                      {staff.premiumShiftCount > 0 ? (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Standard</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}