interface User {
  username: string;
  role: string;
  id?: string;
}

const Dashboard = () => {
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="dashboard-wrapper light-theme">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Welcome back, {user.username}!</h1>
        <p> Keep on dreaming, keep on improving,
           powered by clearSKY.</p>

        <div className="dashboard-card">
          <h2 className="dashboard-section-title">Your Info</h2>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Role:</strong> {user.role}</p>

        </div>

        <div className="dashboard-card">
          <h2 className="dashboard-section-title">About the App</h2>
          <p>
            This platform allows users to manage grades, reviews, and user-related data 
            through a microservices architecture. It’s built with React, Node.js, and Docker.
          </p>
        </div>
        <div className="epilogue">
          <p>
            THE state of the art phititology web app!</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
