// const [isLoading, setIsLoading] = useState(false);
import axios from "axios";

const API_URL = "http://localhost:5000";

export const createProject = async (title, e) => {
  // const [error, setError] = useState("");
  //   const name = prompt("Enter project name:");
  e.preventDefault();
  if (!title) return;

  try {
    //     setIsLoading(true);
    const response = await axios.post(`${API_URL}/api/projects/create`, {
      title,
    });
    console.log(`Project Successfully Created - ${title}`);
    // await loadProjects();
    // loadProject(response.data.project.id);
  } catch (error) {
    console.log("Failed to create project: " + error.message);
  }
  // finally {
  //   setIsLoading(false);
  // }
};
