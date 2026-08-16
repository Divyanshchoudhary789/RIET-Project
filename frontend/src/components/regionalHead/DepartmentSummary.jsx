import React from "react";

const departments = [
  "Marketing",
  "HR",
  "Operations",
  "Academics",
  "Events",
  "Administration",
];

const DepartmentSummary = () => {
  return (
    <div className="department-card">

      <h3>By department</h3>

      {departments.map((department) => (
        <div
          key={department}
          className="department-row"
        >
          <span>{department}</span>

          <span>0</span>
        </div>
      ))}

    </div>
  );
};

export default DepartmentSummary;
