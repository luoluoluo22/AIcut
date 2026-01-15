/**
 * Remotion Root - Entry point for Remotion rendering
 * This file defines all compositions that can be rendered
 */

import { registerRoot, Composition } from "remotion";
import React from "react";
import { ExportComposition } from "./export-composition";

// Default composition settings
const FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="AIcutExport"
                component={ExportComposition}
                durationInFrames={300} // Will be overridden by inputProps
                fps={FPS}
                width={DEFAULT_WIDTH}
                height={DEFAULT_HEIGHT}
                defaultProps={{
                    projectData: null,
                }}
            />
        </>
    );
};

// Register the root component - REQUIRED for Remotion
registerRoot(RemotionRoot);
