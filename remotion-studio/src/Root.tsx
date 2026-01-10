import { Composition } from 'remotion';
import { MemoryVideo } from './Composition';

// 使用 Webpack 的 require.context 替代 import.meta.glob
// @ts-ignore
const projectsContext = require.context('./projects', false, /\.json$/);
const projectFiles = projectsContext.keys().reduce((acc: any, key: string) => {
    acc[key] = projectsContext(key);
    return acc;
}, {});

export const RemotionRoot: React.FC = () => {
    const projects = Object.entries(projectFiles);

    return (
        <>
            {projects.map(([path, content]: [string, any], index) => {
                const projectData = content.default || content;
                // 原始 ID：根据文件名转换（如 felt_utakata -> felt-utakata）
                const id = path.replace('./', '').replace('.json', '').replace(/_/g, '-') || 'unknown';

                return (
                    <React.Fragment key={id}>
                        {/* 1. 注册原始 ID 的 Composition */}
                        <Composition
                            id={id}
                            component={MemoryVideo}
                            durationInFrames={Math.max(1, Math.floor((projectData.duration || 1) * 30))}
                            fps={30}
                            width={projectData.resolution?.width || 1280}
                            height={projectData.resolution?.height || 720}
                            defaultProps={{
                                initialProjectData: projectData
                            }}
                        />

                        {/* 2. 如果是第一个项目，额外注册一个名为 "MemoryVideo" 的 ID 以保证兼容性 */}
                        {index === 0 && (
                            <Composition
                                id="MemoryVideo"
                                component={MemoryVideo}
                                durationInFrames={Math.max(1, Math.floor((projectData.duration || 1) * 30))}
                                fps={30}
                                width={projectData.resolution?.width || 1280}
                                height={projectData.resolution?.height || 720}
                                defaultProps={{
                                    initialProjectData: projectData
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};
