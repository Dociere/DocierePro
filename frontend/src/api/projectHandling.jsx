// const [isLoading, setIsLoading] = useState(false);
import axios from "axios";

const API_URL = "http://localhost:5000";

export const createProject = async (
  title,
  authorDetails,
  userIdea,
  isGenChecked,
  e
) => {
  e.preventDefault();
  if (!title) return;

  try {
    const payload = {
      title,
      authorDetails,
      generateBoilerplate: isGenChecked,
      userIdea: isGenChecked ? userIdea : null,
    };

    const response = await axios.post(
      `${API_URL}/api/projects/create`,
      payload
    );
    console.log(`Project Successfully Created - ${title}`);
    return response.data.project.id; // Return project ID for navigation
  } catch (error) {
    console.log("Failed to create project: " + error.message);
    throw error;
  }
};
