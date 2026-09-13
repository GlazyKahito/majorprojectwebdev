export const isAdmin = (user) => user?.role === "admin";

export const isPrivileged = (user) => user?.role === "admin" || user?.role === "manager";

export const can = (user, action) => {
  if (!user) return false;
  switch (action) {
    case "users:manage":
      return isAdmin(user);
    case "customers:delete":
    case "leads:delete":
    case "records:assign":
    case "analytics:team":
      return isPrivileged(user);
    default:
      return true;
  }
};

export const canDeleteTask = (user, task) => isPrivileged(user) || String(task?.createdBy?._id ?? task?.createdBy) === String(user?._id);
