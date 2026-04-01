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
import { useShifts } from '@/hooks/shifts';
import { useLocations } from '@/hooks/locations';
import { useStaff } from '@/hooks/staff';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StaffHours {
  staffId: string;
  staffName: string;
  desiredHours: number;
  actualHours: number;
  difference: number;
}

function calculateStaffHours(
  shifts: unknown[],
  staffList: { id: string; name: string; desiredHours?: number }[]
): StaffHours[] {
  const hoursMap: Record<string, number> = {};

  (shifts as unknown[]).forEach((shift: unknown) => {
    const shiftData = shift as {
      startTime: string;
      endTime: string;
      assignments?: { staffId: string }[];
    };
    if (!shiftData.assignments) return;

    const start = new Date(shiftData.startTime);
    const end = new Date(shiftData.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    shiftData.assignments.forEach((assignment: { staffId: string }) => {
      hoursMap[assignment.staffId] = (hoursMap[assignment.staffId] || 0) + hours;
    });
  });

  return staffList.map((staff) => {
    const actualHours = hoursMap[staff.id] || 0;
    const desiredHours = staff.desiredHours || 40;
    const difference = actualHours - desiredHours;
    return {
      staffId: staff.id,
      staffName: staff.name,
      desiredHours,
      actualHours,
      difference,
    };
  });
}

function getHoursStatus(difference: number) {
  if (difference < -5) return { variant: 'destructive' as const, icon: TrendingDown };
  if (difference > 5) return { variant: 'default' as const, icon: TrendingUp };
  return { variant: 'secondary' as const, icon: Minus };
}

function getDifferenceBadge(difference: number) {
  if (difference > 0) return <Badge variant="default">+{difference.toFixed(1)}h</Badge>;
  if (difference < 0) return <Badge variant="destructive">{difference.toFixed(1)}h</Badge>;
  return <Badge variant="secondary">On target</Badge>;
}

export function FairnessAnalytics() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  });

  const { data: locations } = useLocations();
  const { data: staffData } = useStaff({ locationId: selectedLocation !== 'all' ? selectedLocation : undefined });
  const { data: shiftsData, isLoading } = useShifts({
    locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
    startDate: selectedWeek,
    endDate: new Date(new Date(selectedWeek).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const staffHours = calculateStaffHours(
    shiftsData || [],
    (staffData || []).map((s) => ({ id: (s as { id: string }).id, name: (s as { name: string }).name, desiredHours: (s as { desiredHours?: number }).desiredHours }))
  );

  const totalDesired = staffHours.reduce((sum, s) => sum + s.desiredHours, 0);
  const totalActual = staffHours.reduce((sum, s) => sum + s.actualHours, 0);
  const avgDifference = staffHours.length > 0 ? totalActual - totalDesired / staffHours.length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fairness Analytics</h1>
        <p className="text-muted-foreground">Monitor staff hours distribution and fairness</p>
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
            <CardDescription>Total Desired Hours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalDesired.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scheduled Hours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalActual.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Variance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${avgDifference > 0 ? 'text-green-600' : avgDifference < 0 ? 'text-red-600' : ''}`}>
              {avgDifference > 0 ? '+' : ''}{avgDifference.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Hours Distribution</CardTitle>
          <CardDescription>Desired vs actual hours per staff member</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : staffHours.length === 0 ? (
            <p className="text-muted-foreground">No staff data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Desired Hours</TableHead>
                  <TableHead>Actual Hours</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffHours.map((staff) => {
                  const { icon: Icon } = getHoursStatus(staff.difference);
                  return (
                    <TableRow key={staff.staffId}>
                      <TableCell className="font-medium">{staff.staffName}</TableCell>
                      <TableCell>{staff.desiredHours}h</TableCell>
                      <TableCell>{staff.actualHours.toFixed(1)}h</TableCell>
                      <TableCell>
                        <span className={staff.difference > 0 ? 'text-green-600' : staff.difference < 0 ? 'text-red-600' : ''}>
                          {staff.difference > 0 ? '+' : ''}{staff.difference.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {getDifferenceBadge(staff.difference)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}