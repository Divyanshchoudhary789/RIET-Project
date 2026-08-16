import React from "react";
import { FilePlus2 } from "lucide-react";

const DashboardHeader = () => {
  return (
    <div className="dashboard-header">

      <div>

        <p className="dashboard-subtitle">
          REGIONAL HEAD · OVERVIEW
        </p>

        <h1 className="dashboard-title">
          Good day, Regional Head
        </h1>

        <p className="dashboard-description">
          Notesheets from across the institutes, awaiting your action.
        </p>

      </div>

      <button className="memo-btn">
        <FilePlus2 size={20} />
        <span>Generate new memo</span>
      </button>

    </div>
  );
};

export default DashboardHeader;
