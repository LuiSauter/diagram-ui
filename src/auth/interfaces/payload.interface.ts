import { ROLES } from 'src/common/constants';

export interface IPayload {
  sub: string;
  role: ROLES;
}

export interface IPayloadWorkspace {
  sub: string;
  workspace: string;
  role: string
}