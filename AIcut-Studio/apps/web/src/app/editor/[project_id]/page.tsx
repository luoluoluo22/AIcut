import EditorClient from "./EditorClient";

export function generateStaticParams() {
  return [{ project_id: "demo" }];
}

export default function EditorPage() {
  return <EditorClient />;
}
