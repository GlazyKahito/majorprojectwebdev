import useTeam from "../../hooks/useTeam";
import { ROLES } from "../../utils/constants";
import { Select } from "../ui";

export default function AssigneeSelect({ value, onChange, allowEmpty = true, emptyLabel = "Unassigned", disabled, label, hint, error, size, className, ...props }) {
  const { team, loading } = useTeam();
  return (
    <Select
      label={label}
      hint={hint}
      error={error}
      size={size}
      className={className}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      placeholder={allowEmpty ? emptyLabel : undefined}
      {...props}
    >
      {team.map((member) => (
        <option key={member._id} value={member._id}>
          {member.name} · {ROLES[member.role]}
        </option>
      ))}
    </Select>
  );
}
