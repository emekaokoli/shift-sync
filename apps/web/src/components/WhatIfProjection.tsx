import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConstraintViolation {
  type: string;
  message: string;
  severity: 'warning' | 'error';
}

interface WhatIfProjectionProps {
  proposedShift?: {
    startTime: string;
    endTime: string;
    locationId: string;
  };
  proposedStaffId?: string;
  currentWeeklyHours: number;
  newShiftHours: number;
  desiredHours: number;
  isOvertime: boolean;
  isWarning: boolean;
  constraintViolations: ConstraintViolation[];
}

function calculateTotalHours(currentHours: number, newHours: number): number {
  return currentHours + newHours;
}

function getOvertimeStatus(isOvertime: boolean, isWarning: boolean): { label: string; variant: 'destructive' | 'default' | 'secondary' } {
  if (isOvertime) return { label: 'Overtime', variant: 'destructive' };
  if (isWarning) return { label: 'At Limit', variant: 'default' };
  return { label: 'Within Limits', variant: 'secondary' };
}

export function WhatIfProjection({
  proposedShift,
  proposedStaffId,
  currentWeeklyHours,
  newShiftHours,
  desiredHours,
  isOvertime,
  isWarning,
  constraintViolations,
}: WhatIfProjectionProps) {
  const totalHours = calculateTotalHours(currentWeeklyHours, newShiftHours);
  const hoursOverDesired = totalHours - desiredHours;
  const { label: overtimeLabel, variant: overtimeVariant } = getOvertimeStatus(isOvertime, isWarning);

  if (!proposedShift || !proposedStaffId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium">What-if Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a shift and staff member to preview impact.</p>
        </CardContent>
      </Card>
    );
  }

  const shiftStart = new Date(proposedShift.startTime);
  const shiftEnd = new Date(proposedShift.endTime);
  const formattedShiftTime = `${shiftStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${shiftEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  return (
    <Card className={isOvertime ? 'border-red-300 bg-red-50' : isWarning ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">What-if Projection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Weekly Hours</p>
            <p className="text-lg font-semibold">{currentWeeklyHours.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">New Shift</p>
            <p className="text-lg font-semibold">+{newShiftHours.toFixed(1)}h</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Projected Total</p>
              <p className="text-xs text-muted-foreground">vs Desired: {desiredHours}h</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
              <Badge variant={overtimeVariant}>{overtimeLabel}</Badge>
            </div>
          </div>
          {hoursOverDesired > 0 && (
            <p className="text-sm text-red-600 mt-2">
              +{hoursOverDesired.toFixed(1)}h over desired hours
            </p>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          <p>Proposed shift: {formattedShiftTime}</p>
        </div>

        {constraintViolations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Constraint Violations</p>
            {constraintViolations.map((violation, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  violation.severity === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}
              >
                <span className="font-medium">{violation.type}:</span> {violation.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}