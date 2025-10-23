import { useState } from "react";
import { type JSONValue } from "ai";
import { Code2 } from "lucide-react";

export const ToolOutput = ({ output }: { output: JSONValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!output) return null;

  // Handle string output
  if (typeof output === "string") {
    const isLong = output.length > 500;
    const displayText =
      isLong && !isExpanded ? output.slice(0, 500) + "..." : output;

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap wrap-break-word">
          {displayText}
        </div>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  }

  // Handle object/array output - format as JSON
  const jsonString = JSON.stringify(output, null, 2);
  const isLong = jsonString.length > 800;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Code2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Result
        </span>
      </div>
      <div
        className={`${isLong && !isExpanded ? "max-h-40" : "max-h-96"} overflow-y-auto`}
      >
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <code>
            {isLong && !isExpanded
              ? jsonString.slice(0, 800) + "\n..."
              : jsonString}
          </code>
        </pre>
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};
