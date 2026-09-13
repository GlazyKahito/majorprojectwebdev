const ROLES = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  EXECUTIVE: "executive",
});

const ROLE_LABELS = Object.freeze({
  admin: "Admin",
  manager: "Sales Manager",
  executive: "Sales Executive",
});

const isPrivileged = (user) => user && [ROLES.ADMIN, ROLES.MANAGER].includes(user.role);

module.exports = { ROLES, ROLE_LABELS, isPrivileged };
