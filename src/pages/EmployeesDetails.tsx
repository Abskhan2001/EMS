import React, { useState, useEffect, useRef, useContext } from "react";
import { supabase } from "../lib/supabase";
import Employeeprofile from "./Employeeprofile";

import {
  FiPlus,
  FiTrash2,
  FiX,
  FiPlusSquare,
} from "react-icons/fi";
import { AttendanceContext } from "./AttendanceContext";
import TaskBoardAdmin from "../components/TaskBoardAdmin";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  joining_date?: string;
  projects?: any[];
  TotalKPI?: number;
  role?: string;
  // Add other employee properties as needed
  lastincrement?: string | null; // Last increment date (nullable)
  upcomingincrement?: string | null; // Upcoming increment date (nullable)
  rating?: number; // Employee rating (nullable)
}

interface Project {
  id: string;
  title: string;
  devops: any[];
}

const EmployeesDetails = () => {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [employeeview, setEmployeeView] = useState<
    "generalview" | "detailview"
  >("generalview");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [assignment, setAssignment] = useState({
    title: "",
    project: "",
    description: "",
    score: "",
  });

  const [selectedTAB, setSelectedTAB] = useState("");
  const [performancePeriod, setPerformancePeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [showPerformanceMenu, setShowPerformanceMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { openTaskBoard } = useContext(AttendanceContext);
  const formRef = useRef<HTMLFormElement>(null);

  // Form states
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
  });

  // Restore needed state variables for TaskBoardAdmin and employee selection
  const [devopss, setDevopss] = useState<any[]>([]);
  const [ProjectId, setProjectId] = useState<string>("");
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Ensure formData uses the FormDataType with index signature
  type FormDataType = {
    full_name: string;
    role: string;
    phone: string;
    email: string;
    personal_email: string;
    location: string;
    profession: string;
    per_hour_pay: string;
    salary: string;
    slack_id: string;
    joining_date: string;
    profile_image: File | null;
    [key: string]: any;
  };
  const [formData, setFormData] = useState<FormDataType>({
    full_name: "",
    role: "employee",
    phone: "",
    email: "",
    personal_email: "",
    location: "",
    profession: "",
    per_hour_pay: "",
    salary: "",
    slack_id: "",
    joining_date: "",
    profile_image: null,
  });

  const [step, setStep] = useState(1);

  // Fetch employees with their projects and tasks
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("users")
        .select("*");
      if (employeesError) throw employeesError;

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, title, devops");
      if (projectsError) throw projectsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks_of_projects")
        .select("*");
      if (tasksError) throw tasksError;

      // Fetch increments
      const { data: increamentdata, error: increamenterror } = await supabase
        .from("sallery_increment")
        .select("*");
      if (increamenterror) {
        console.error(
          "Error fetching increament data:",
          increamenterror.message
        );
      }
      // Calculate date range for selected period
      let startDate;
      const today = new Date();
      if (performancePeriod === "daily") {
        startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
      } else if (performancePeriod === "weekly") {
        const dayOfWeek = today.getDay();
        startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - dayOfWeek
        );
      } else if (performancePeriod === "monthly") {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      // Add check for startDate before using .toISOString()
      if (!startDate) return;
      // Fetch ratings for all employees from dailylog (latest rating per employee in period)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("dailylog")
        .select("userid, rating, rated_at")
        .not("rating", "is", null)
        .gte("rated_at", startDate.toISOString());
      if (ratingsError) {
        console.error("Error fetching ratings:", ratingsError.message);
      }
      // Map: userid -> latest rating in period
      const latestRatings: { [key: string]: any } = {};
      if (ratingsData) {
        // For each user, find the latest rating in the period
        ratingsData.forEach((row) => {
          if (!row.userid) return;
          if (
            !latestRatings[row.userid] ||
            new Date(row.rated_at) >
              new Date(latestRatings[row.userid].rated_at)
          ) {
            latestRatings[row.userid] = row;
          }
        });
      }
      // Process employee data
      const employeesWithProjects = employeesData.map((employee) => {
        const employeeProjects = projectsData.filter((project) =>
          project.devops?.some((dev: any) => dev.id === employee.id)
        );
        // Get last increment date
        let increamentdataone = "N/A";
        let upcomingIncrementDate = "N/A";
        const incrementone = increamentdata?.filter(
          (increament) => increament.user_id === employee.id
        );
        const sortedIncrements = [...(incrementone || [])].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        if (sortedIncrements.length > 0) {
          const latestIncrement = sortedIncrements[0];
          if (latestIncrement.increment_date) {
            increamentdataone = latestIncrement.increment_date;
          }
          if (latestIncrement.upcomming_increment) {
            upcomingIncrementDate = latestIncrement.upcomming_increment;
          }
        }
        const employeeTasks = tasksData.filter(
          (task) =>
            task.devops?.some((dev: any) => dev.id === employee.id) &&
            task.status?.toLowerCase() !== "done"
        );
        const totalKPI = employeeTasks.reduce(
          (sum, task) => sum + (Number(task.score) || 0),
          0
        );
        const employeeTaskscompleted = tasksData.filter(
          (task) =>
            task.devops?.some((dev: any) => dev.id === employee.id) &&
            task.status?.toLowerCase() == "done"
        );
        const completedKPI = employeeTaskscompleted.reduce(
          (sum, task) => sum + (Number(task.score) || 0),
          0
        );
        // Get latest rating from dailylog
        const latestRating = latestRatings[employee.id]?.rating || null;
        return {
          ...employee,
          joining_date: employee.joining_date || "NA",
          lastincrement: increamentdataone,
          upcomingincrement: upcomingIncrementDate.split("T")[0] || "N/A",
          projects: employeeProjects,
          projectid: employeeProjects.map((project) => project.id),
          TotalKPI: totalKPI,
          activeTaskCount: employeeTasks.length,
          completedKPI: completedKPI,
          rating: latestRating,
        };
      });
      setEmployees(employeesWithProjects);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [performancePeriod]); // <-- Add performancePeriod as dependency

  // Handle task assignment
  const handleAssignClick = async (employee: Employee) => {
    setCurrentEmployee(employee);
    setEmployeeId(employee.id);

    const { data: allProjects, error } = await supabase
      .from("projects")
      .select("*");

    if (error) {
      console.error("Error fetching projects:", error.message);
      return;
    }

    const userProjects = allProjects.filter((project) =>
      project.devops?.some((item: any) => item.id === employee.id)
    );

    setUserProjects(userProjects);
    setAssignment((prev) => ({
      ...prev,
      project: userProjects[0]?.title || "",
    }));

    setShowModal(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const selectedProject = userProjects.find(
        (p) => p.title === assignment.project
      );
      if (!selectedProject) throw new Error("Project not found");

      // Insert the task into the database
      const { data: insertedTask, error } = await supabase
        .from("tasks_of_projects")
        .insert([
          {
            project_id: selectedProject.id,
            title: assignment.title,
            description: assignment.description,
            devops: [{ id: employeeId, name: currentEmployee?.full_name }],
            status: "todo",
            score: assignment.score,
            created_at: new Date().toISOString(),
          },
        ])
        .select(); // Return the inserted task

      if (error) throw error;

      // Get the inserted task ID
      const taskId = insertedTask?.[0]?.id;

      // Get the employee's name for the notification
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", employeeId)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      } else {
        // Send notification to all devices of the employee
        try {
          console.log(
            `Attempting to send notification to employee ${employeeId}`
          );

          // Always use the userId parameter to try both the fcm_tokens table and users table
          const notificationPayload = {
            title: "New Task Assigned",
            body: `You have been assigned a new task: ${assignment.title} in project ${selectedProject.title}`,
            userId: employeeId, // This will try all devices
            taskId: taskId,
            projectId: selectedProject.id,
            url: `/taskboard?projectId=${selectedProject.id}`,
          };

          // Send the notification
          console.log(
            "Sending notification with payload:",
            notificationPayload
          );
          const response = await fetch(
            "https://ems-server-0bvq.onrender.com/send-singlenotifications",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(notificationPayload),
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log(
                `Notification sent to ${userData?.full_name || "employee"} on ${
                  result.successCount
                } device(s)`
              );
              console.log("Notification result:", result);
            } else {
              console.log(
                `No notifications sent to ${
                  userData?.full_name || "employee"
                } - user may not have enabled notifications`
              );
              console.log("Notification result:", result);

              // If the user has no valid tokens, we need to regenerate one
              if (
                result.message &&
                result.message.includes("No valid FCM tokens found")
              ) {
                // Show a message to the user that the employee needs to enable notifications
                alert(
                  `${
                    userData?.full_name || "Employee"
                  } needs to enable notifications. Please ask them to log in and allow notifications.`
                );

                // Clear any invalid tokens for this user
                try {
                  const { error: clearError } = await supabase
                    .from("users")
                    .update({ fcm_token: null })
                    .eq("id", employeeId);

                  if (!clearError) {
                    console.log(
                      `Cleared invalid tokens for user ${employeeId}`
                    );
                  }

                  // Also clear from fcm_tokens table
                  const { error: deleteError } = await supabase
                    .from("fcm_tokens")
                    .delete()
                    .eq("user_id", employeeId);

                  if (!deleteError) {
                    console.log(
                      `Cleared all tokens from fcm_tokens table for user ${employeeId}`
                    );
                  }
                } catch (clearError) {
                  console.error("Error clearing invalid tokens:", clearError);
                }
              }
            }
          } else {
            console.log(
              `Failed to send notification to ${
                userData?.full_name || "employee"
              } - server returned ${response.status}`
            );
            const errorText = await response.text();
            console.error("Error response:", errorText);
          }
        } catch (notificationError) {
          console.error("Error sending notification:", notificationError);
          // Non-critical error, continue with task assignment
        }
      }

      setAssignment({
        title: "",
        project: "",
        description: "",
        score: "",
      });
      setShowModal(false);
      fetchEmployees(); // Refresh data
      alert("Task assigned successfully!");
    } catch (err) {
      console.error("Error assigning task:", err);
      alert(
        "Failed to assign task: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  // Employee form handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      if (error) throw error;
      if (data.user) {
        setEmployeeId(data.user.id);
        setStep(2);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSubmitEmployeeInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let profileImageUrl = null;

      if (formData.profile_image) {
        const fileExt = formData.profile_image.name.split(".").pop();
        const fileName = `${employeeId}_profile.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("profilepics")
          .upload(fileName, formData.profile_image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profilepics").getPublicUrl(fileName);

        profileImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("users")
        .update([
          {
            ...formData,
            phone_number: formData.phone,
            per_hour_pay: Number(formData.per_hour_pay),
            salary: Number(formData.salary),
            profile_image: profileImageUrl,
            joining_date: formData.joining_date || new Date().toISOString(),
          },
        ])
        .eq("id", employeeId);

      if (error) throw error;

      resetForm();
      setShowForm(false);
      setStep(1);
      fetchEmployees();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      role: "employee",
      phone: "",
      email: "",
      personal_email: "",
      location: "",
      profession: "",
      per_hour_pay: "",
      salary: "",
      slack_id: "",
      joining_date: "",
      profile_image: null,
    });
    setSignupData({ email: "", password: "" });
    if (formRef.current) formRef.current.reset();
  };

  const Loader = () => (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
      <svg
        className="animate-spin h-14 w-14 text-[#9A00FF]"
        viewBox="0 0 50 50"
      >
        <circle
          className="opacity-20"
          cx="25"
          cy="25"
          r="20"
          stroke="#9A00FF"
          strokeWidth="6"
          fill="none"
        />
        <path
          className="opacity-80"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="65, 150"
          d="M25 5
             a 20 20 0 0 1 0 40
             a 20 20 0 0 1 0 -40"
        />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9A00FF" />
            <stop offset="100%" stopColor="#5A00B4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pt-4 text-[#9A00FF] font-semibold text-lg animate-pulse">
        Loading employees...
      </div>
    </div>
  );

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
    setStep(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  // Inline StarDisplay component for ratings
  const StarDisplay: React.FC<{
    rating: number;
    size?: "sm" | "md" | "lg";
  }> = ({ rating, size = "sm" }) => {
    const getStarColor = (rating: number) => {
      if (rating <= 2) return "text-red-400 fill-red-400";
      if (rating <= 4) return "text-yellow-400 fill-yellow-400";
      return "text-green-400 fill-green-400";
    };
    const getStarSize = (size: string) => {
      switch (size) {
        case "sm":
          return "w-3 h-3";
        case "md":
          return "w-4 h-4";
        case "lg":
          return "w-5 h-5";
        default:
          return "w-3 h-3";
      }
    };
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`${getStarSize(size)} ${
              i <= rating ? getStarColor(rating) : "text-gray-300 fill-gray-300"
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
          </svg>
        ))}
      </div>
    );
  };

  // Render methods
  const renderEmployeeForm = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {step === 1 ? "Create Account" : "Employee Details"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex mb-6">
            <div
              className={`flex-1 border-t-2 ${
                step >= 1 ? "border-[#9A00FF]" : "border-gray-200"
              }`}
            ></div>
            <div
              className={`flex-1 border-t-2 ${
                step >= 2 ? "border-[#9A00FF]" : "border-gray-200"
              }`}
            ></div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSubmitSignUp} className="space-y-4">
              {/* Signup form fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] shadow-sm"
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitEmployeeInfo} className="space-y-4">
              {/* Employee details form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData).map(
                  ([field, value]) =>
                    field !== "profile_image" && (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                          {field.replace(/_/g, " ")}
                        </label>
                        {field === "role" ? (
                          <select
                            name={field}
                            value={value as string}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <input
                            type={field === "joining_date" ? "date" : "text"}
                            name={field}
                            value={
                              field === "email"
                                ? signupData.email
                                : (value as string)
                            }
                            onChange={handleInputChange}
                            disabled={field === "email"}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent disabled:bg-gray-100"
                          />
                        )}
                      </div>
                    )
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Image
                  </label>
                  <input
                    type="file"
                    name="profile_image"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        profile_image: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] shadow-sm"
                >
                  Save Employee
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  const renderAssignTaskModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Assign Task to {currentEmployee?.full_name}
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                value={assignment.title}
                onChange={(e) =>
                  setAssignment((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              {userProjects.length > 0 ? (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                  value={assignment.project}
                  onChange={(e) =>
                    setAssignment((prev) => ({
                      ...prev,
                      project: e.target.value,
                    }))
                  }
                >
                  {userProjects.map((project) => (
                    <option key={project.id} value={project.title}>
                      {project.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No projects available
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                rows={3}
                value={assignment.description}
                onChange={(e) =>
                  setAssignment((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                value={assignment.score}
                onChange={(e) =>
                  setAssignment((prev) => ({ ...prev, score: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignSubmit}
                disabled={!assignment.title}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] shadow-sm disabled:opacity-70"
              >
                Assign Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6">
      {selectedTAB === "TaskBoard" ? (
        <TaskBoardAdmin
          devopss={devopss}
          ProjectId={ProjectId}
          setSelectedTAB={setSelectedTAB}
          selectedTAB={selectedTAB}
        />
      ) : (
        <>
          {showForm && renderEmployeeForm()}
          {showModal && renderAssignTaskModal()}

          {employeeview === "detailview" ? (
            <Employeeprofile
              employeeid={employeeId}
              employeeview={employeeview}
              employee={currentEmployee}
              setemployeeview={setEmployeeView}
            />
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="">
                {/* <form className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
                      <p className="text-gray-500 mt-1">View and manage your team members</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        name="password"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] transition-colors shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </form> */}

                {/* Step 2: Employee Info Form */}
                {step === 2 && (
                  <form
                    onSubmit={handleSubmitEmployeeInfo}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        "full_name",
                        "role",
                        "phone",
                        "email",
                        "personal_email",
                        "location",
                        "profession",
                        "per_hour_pay",
                        "salary",
                        "slack_id",
                        "joining_date",
                      ].map((field) => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                            {field.replace(/_/g, " ")}
                          </label>
                          {field === "role" ? (
                            <select
                              name="role"
                              value={formData.role}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <input
                              type={field === "joining_date" ? "date" : "text"}
                              name={field}
                              value={
                                field === "email"
                                  ? signupData.email
                                  : formData[field]
                              }
                              onChange={handleInputChange}
                              disabled={field === "email"}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent disabled:bg-gray-100"
                            />
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profile Image
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex-1 cursor-pointer">
                            <div className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                              <span className="text-sm text-gray-700">
                                Choose file
                              </span>
                              <input
                                type="file"
                                name="profile_image"
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    profile_image: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                                  }))
                                }
                                className="hidden"
                              />
                            </div>
                          </label>
                          {formData.profile_image && (
                            <span className="text-sm text-gray-500 truncate">
                              {formData.profile_image.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] transition-colors shadow-sm"
                      >
                        Save Employee
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-7xl mx-auto">
            {/* General Employee View */}
            {employeeview === "generalview" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">
                        Team Management
                      </h1>
                      <p className="text-gray-500 mt-1">
                        View and manage your team members
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-48">
                        <input
                          type="text"
                          placeholder="Search employees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9A00FF] hover:bg-[#8a00e6] text-white text-sm font-medium transition-colors shadow-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        <span>Add Employee</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Employee Table */}

                {loading ? (
                  <Loader />
                ) : (
                  <div className="w-full ">
                    <div className="hidden md:block w-full">
                      <div className="w-full inline-block align-middle">
                        <div className="overflow-x-auto ">
                          <table className="w-full divide-y divide-gray-200 table-auto">
                            <thead className="bg-gray-50">
                              <tr className="">
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Employee
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Joined
                                </th>

                                <th
                                  scope="col"
                                  className="px-3 lg:px-34 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Last increament
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Upcoming increament
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Projects
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Workload
                                </th>
                                <th
                                  scope="col"
                                  className="  px-4 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {/* <ul>
                                    <li>
                                      <ArrowLeft />
                                    </li>
                                  </ul> */}
                                  Performance
                                  <div className="relative inline-block text-left ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowPerformanceMenu((v) => !v)
                                      }
                                      className="inline-flex justify-center w-[120px] rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                                      id="performance-menu"
                                      aria-haspopup="true"
                                      aria-expanded={showPerformanceMenu}
                                    >
                                      {performancePeriod
                                        .charAt(0)
                                        .toUpperCase() +
                                        performancePeriod.slice(1)}{" "}
                                      ▼
                                    </button>
                                    {showPerformanceMenu && (
                                      <div className="origin-top-right absolute right-0  w-28 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                        <div
                                          className="py-1"
                                          role="menu"
                                          aria-orientation="vertical"
                                          aria-labelledby="performance-menu"
                                        >
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod("daily");
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === "daily"
                                                ? "bg-gray-100"
                                                : ""
                                            }`}
                                          >
                                            Daily
                                          </button>
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod("weekly");
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === "weekly"
                                                ? "bg-gray-100"
                                                : ""
                                            }`}
                                          >
                                            Weekly
                                          </button>
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod("monthly");
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === "monthly"
                                                ? "bg-gray-100"
                                                : ""
                                            }`}
                                          >
                                            Monthly
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* <ul>
                                    <li>
                                      <ArrowRight />{" "}
                                    </li>
                                  </ul> */}
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {employees
                                .filter(
                                  (entry) =>
                                    entry.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    entry.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((entry) => {
                                  return (
                                    <tr
                                      key={entry.id}
                                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setEmployee(entry);
                                        setEmployeeId(entry.id);
                                        setEmployeeView("detailview");
                                      }}
                                    >
                                      <td className="px-4 lg:px-2 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                          <div className="h-9 w-9 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium text-xs">
                                            {entry.full_name?.charAt(0) || '?'}
                                          </div>
                                          <div>
                                            <div className="font-semibold text-gray-800 text-sm">
                                              {entry.full_name || 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-500">{entry.email || 'N/A'}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.joining_date && entry.joining_date !== 'NA' ? new Date(entry.joining_date).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.lastincrement && entry.lastincrement !== 'N/A' ? new Date(entry.lastincrement).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.upcomingincrement && entry.upcomingincrement !== 'N/A' ? new Date(entry.upcomingincrement).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.projects && entry.projects.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            {entry.projects.slice(0, 2).map((project: any) => (
                                              <button
                                                key={project.id}
                                                onClick={() => openTaskBoard(project.id, project.devops)}
                                                className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700"
                                              >
                                                {project.title}
                                              </button>
                                            ))}
                                            {entry.projects.length > 2 && (
                                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                                +{entry.projects.length - 2}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-400">Not assigned</span>
                                        )}
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <span className="font-medium">{entry.TotalKPI ?? 0}</span>
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-center">
                                        <StarDisplay rating={typeof entry.rating === 'number' ? entry.rating : 0} size="md" />
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            onClick={() => handleAssignClick(entry)}
                                            className="p-1.5 rounded-lg bg-[#9A00FF]/10 text-[#9A00FF] hover:bg-[#9A00FF]/20 transition-colors"
                                            title="Assign Task"
                                          >
                                            <FiPlusSquare className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            title="Delete"
                                          >
                                            <FiTrash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Mobile card view - shown only on small screens */}
                    <div className="md:hidden">
                      {employees
                        .filter(
                          (entry) =>
                            entry.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            entry.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden border border-gray-200"
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <button
                                  onClick={() => {
                                    setEmployee(entry);
                                    setEmployeeId(entry.id);
                                    setEmployeeView("detailview");
                                  }}
                                  className="flex items-center gap-3 group"
                                >
                                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium text-xs">
                                    {entry.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div className="text-left">
                                    <div className="font-semibold text-gray-800 text-sm">
                                      {entry.full_name || 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">{entry.email || 'N/A'}</div>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleAssignClick(entry)}
                                    className="p-1.5 rounded-lg bg-[#9A00FF]/10 text-[#9A00FF] hover:bg-[#9A00FF]/20 transition-colors"
                                    title="Assign Task"
                                  >
                                    <FiPlusSquare className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Joined
                                  </p>
                                  <p className="text-gray-700 truncate font-semibold max-w-[120px] ">
                                    {entry.joining_date && entry.joining_date !== 'NA' ? new Date(entry.joining_date).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>

                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Last Increment
                                  </p>
                                  <p className="text-gray-700 truncate font-semibold max-w-[120px] ">
                                    {entry.lastincrement && entry.lastincrement !== 'N/A' ? new Date(entry.lastincrement).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Upcoming Increment
                                  </p>
                                  <p className="text-gray-700 truncate font-semibold max-w-[120px] ">
                                    {entry.upcomingincrement && entry.upcomingincrement !== 'N/A' ? new Date(entry.upcomingincrement).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Projects
                                  </p>
                                  {entry.projects && entry.projects.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {entry.projects
                                        .slice(0, 2)
                                        .map((project: any) => (
                                          <button
                                            key={project.id}
                                            onClick={() =>
                                              openTaskBoard(project.id, project.devops)
                                            }
                                            className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700"
                                          >
                                            {project.title}
                                          </button>
                                        ))}
                                      {entry.projects.length > 2 && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                          +{entry.projects.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      Not assigned
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Workload
                                  </p>
                                  <span className="text-xs font-medium">
                                    {entry.TotalKPI ?? 0}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-gray-500 font-medium">
                                    Performance
                                  </p>
                                  <StarDisplay rating={typeof entry.rating === 'number' ? entry.rating : 0} size="md" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeesDetails;
