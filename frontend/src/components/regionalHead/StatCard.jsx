import React from "react";

const StatCard = ({ title, value, icon, highlighted = false }) => {
  return (
    <div className={`stat-card ${highlighted ? "highlighted-card" : ""}`}>

      <div className="stat-card-top">
        <span className="stat-title">{title}</span>

        <span className="stat-icon">
          {icon}
        </span>
      </div>

      <h2 className="stat-value">
        {value}
      </h2>

    </div>
  );
};

export default StatCard;
