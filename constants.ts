import { FileNode, FileType } from './types';

export const INITIAL_FILE_SYSTEM: FileNode[] = [
  {
    id: 'root',
    name: 'Project',
    type: FileType.FOLDER,
    parentId: null,
    children: [
      {
        id: 'src',
        name: 'src',
        type: FileType.FOLDER,
        parentId: 'root',
        children: [
          {
            id: 'main_ts',
            name: 'main.ts',
            type: FileType.FILE,
            parentId: 'src',
            language: 'typescript',
            content: `// Welcome to Zero-IDE
// JwP Directive: Execute Code.

console.log("Agent Zero-DH Online.");
const device = "Samsung Galaxy S21 Ultra";

function initSystem() {
  return "Ready for commands.";
}`
          },
          {
            id: 'utils_ts',
            name: 'utils.ts',
            type: FileType.FILE,
            parentId: 'src',
            language: 'typescript',
            content: `export const add = (a: number, b: number) => a + b;`
          }
        ]
      },
      {
        id: 'tasks_json',
        name: 'tasks.json',
        type: FileType.FILE,
        parentId: 'root',
        language: 'json',
        content: `{
  "tasks": [
    {
      "name": "build",
      "command": "echo 'Building project matrix...'; sleep 1; echo 'Optimization complete.'",
      "description": "Compile the current project"
    },
    {
      "name": "test",
      "command": "echo 'Running unit tests...'; echo 'PASSED: main_ts'; echo 'PASSED: utils_ts'",
      "description": "Run project test suite"
    },
    {
      "name": "deploy",
      "command": "echo 'Deploying to Vertex Cloud...'; echo 'Artifact synced successfully.'",
      "description": "Sync artifact with cloud"
    }
  ]
}`
      },
      {
        id: 'readme_md',
        name: 'README.md',
        type: FileType.FILE,
        parentId: 'root',
        language: 'markdown',
        content: `# Zero-IDE Mobile

Operational environment for JwP.
Platform: Web/Android PWA.
Integration: Gemini 3 Pro.`
      }
    ]
  }
];
