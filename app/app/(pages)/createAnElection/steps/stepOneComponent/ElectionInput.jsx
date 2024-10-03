import React, { useState } from "react";

const ElectionInput = ({ elections, setElections }) => {
  const [newElection, setNewElection] = useState("");

  const addElection = () => {
    if (newElection.trim()) {
      setElections([...elections, newElection.trim()]);
      setNewElection("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addElection();
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full">
      <input
        type="text"
        placeholder="Add Choices"
        value={newElection}
        onChange={(e) => setNewElection(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 h-12 p-2 bg-[#222] text-white rounded-[73px] border border-[#1E1E1E]"
      />
      <button
        onClick={addElection}
        className="w-12 h-12 bg-green-600 text-white rounded-[73px] flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
};

export default ElectionInput;
