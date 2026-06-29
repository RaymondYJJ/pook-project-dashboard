export type RoleCode = "super_admin" | "owner" | "finance" | "operation" | "investor" | "readonly";

const roleRank: Record<RoleCode, number> = {
  super_admin: 100,
  owner: 80,
  finance: 60,
  operation: 50,
  investor: 20,
  readonly: 10
};

export function canManageUsers(role: RoleCode) {
  return roleRank[role] >= roleRank.owner;
}

export function canUpload(role: RoleCode) {
  return ["super_admin", "owner", "finance", "operation"].includes(role);
}

export function canViewSensitive(role: RoleCode) {
  return ["super_admin", "owner", "finance"].includes(role);
}

export function canConfigureRules(role: RoleCode) {
  return ["super_admin", "owner", "finance", "operation"].includes(role);
}

export function filterSensitive<T extends Record<string, unknown>>(row: T, role: RoleCode): T {
  if (canViewSensitive(role)) return row;
  const clone: Record<string, unknown> = { ...row };
  for (const key of ["account", "accountName", "bankAccount", "customerPhone", "customerAddress", "address", "phone", "rawOrder", "transactionNo"]) {
    if (key in clone) clone[key] = "[受限]";
  }
  return clone as T;
}
