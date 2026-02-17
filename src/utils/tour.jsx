import { driver } from "driver.js";
import "driver.js/dist/driver.css";

let tourInstance = null;

const steps = [
  {
    popover: {
      title: "Welcome to Docière Pro!",
      description: "Let's create our first project together.",
      nextBtnText: "Start",
      showButtons: ["next", "close"],
    },
  },
  {
    element: "#tour-create-project",
    popover: {
      title: "Start New Project",
      description: "Click this button to start the creation process.",
      showButtons: ["close"], // Hide Next/Back
    },
  },
  {
    element: "#tour-blank-template",
    popover: {
      title: "Select Template",
      description: 'Click on "Blank Document" to choose your template.',
      showButtons: ["close"], // Hide Next/Back
    },
  },
  {
    element: "#title",
    popover: {
      title: "Name Your Project",
      description: "Type a name for your project here, then click Next.",
      showButtons: ["next", "close"],
    },
  },
  {
    element: "#tour-details-next",
    popover: {
      title: "Create Project",
      description: 'Click "Next" to finish the setup and enter your workspace.',
      showButtons: ["close"], // Hide Next/Back
    },
  },
  {
    element: "#tour-project-file",
    popover: {
      title: "Current Project",
      description: "Quick access to your active LaTeX document.",
    },
  },
  {
    element: "#tour-section-space",
    popover: {
      title: "Section Space",
      description: "Manage your project files and structure.",
    },
  },
  {
    element: "#tour-citation-manager",
    popover: {
      title: "Citation Manager",
      description: "Powerful academic search and reference management.",
    },
  },
  {
    element: "#tour-share",
    popover: {
      title: "Share & Collaborate",
      description:
        "Work together with others in real-time on your LaTeX projects.",
    },
  },
  {
    element: "#tour-math-input",
    popover: {
      title: "Easy Math Input",
      description: "Design complex math formulas visually.",
    },
  },
  {
    element: "#tour-extensions",
    popover: {
      title: "Extensions",
      description:
        "Enhance your workflow with powerful add-ons and external integrations.",
    },
  },
  {
    element: "#tour-versioning",
    popover: {
      title: "Draft Versioning",
      description:
        "Save and manage different versions of your work throughout your writing process.",
    },
  },
  {
    element: "#tour-ai-chat",
    popover: {
      title: "AI Assistant",
      description: "Need help writing or debugging LaTeX? Our AI is here.",
    },
  },
  {
    element: "#tour-view-switcher",
    popover: {
      title: "View Switcher",
      description: "Switch between Code, Section, and Rich Text Views.",
    },
  },
  {
    element: "#tour-compile",
    popover: {
      title: "Compile Document",
      description: "Transform your LaTeX into a beautiful PDF.",
    },
  },
  {
    element: "#tour-settings",
    popover: {
      title: "Settings",
      description: "Customize your editor experience here.",
    },
  },
  {
    popover: {
      title: "You're All Set!",
      description: "Happy writing! Restart anytime from the Help menu.",
      nextBtnText: "Finish",
    },
  },
];

export const initTour = () => {
  tourInstance = driver({
    showProgress: false,
    allowClose: false, // Stricter: Prevent closing via Esc or Overlay click
    overlayClickNext: false,
    allowKeyboardControl: false,
    disableActiveInteraction: false, // Allow interaction ONLY with highlighted element
    overlayColor: "rgba(0, 0, 0, 0.85)", // Even darker for focus
    steps: steps,
    onDestroyed: () => {
      localStorage.setItem("dociere_tour_completed", "true");
    },
  });
  return tourInstance;
};

export const startTour = () => {
  if (!tourInstance) initTour();
  tourInstance.drive();
};

export const syncTourWithRoute = (path) => {
  if (!tourInstance || !tourInstance.isActive()) return;

  const stepIndex = tourInstance.getActiveIndex();

  if (path === "/template" && stepIndex === 1) {
    setTimeout(() => tourInstance.moveNext(), 500);
  } else if (path.includes("/detailPage") && stepIndex === 2) {
    setTimeout(() => tourInstance.moveNext(), 500);
  } else if (path === "/canvas" && stepIndex === 4) {
    setTimeout(() => tourInstance.moveNext(), 500);
  }
};
