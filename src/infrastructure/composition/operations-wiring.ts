import { GetCoordinatorDashboard } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.use-case';
import { createGetCoordinatorDashboardSchema } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.input';
import { SubmitDemoComplaint } from '@application/use-cases/submit-demo-complaint/submit-demo-complaint.use-case';
import { createSubmitDemoComplaintSchema } from '@application/use-cases/submit-demo-complaint/submit-demo-complaint.input';
import { zodInputSchema } from './zod-input-schema';

export function buildCoordinatorDashboard(
  ports: ConstructorParameters<typeof GetCoordinatorDashboard>[0],
) {
  return new GetCoordinatorDashboard(ports, createGetCoordinatorDashboardSchema(zodInputSchema));
}

export function buildDemoComplaint(ports: ConstructorParameters<typeof SubmitDemoComplaint>[0]) {
  return new SubmitDemoComplaint(ports, createSubmitDemoComplaintSchema(zodInputSchema));
}
