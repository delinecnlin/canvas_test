import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';

function ProjectsPage() {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  // TODO: 后续对接真实项目数据
  const projects = [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">项目列表</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          新建项目
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.length > 0 ? projects.map(p => (
          <div key={p.id} className="bg-white rounded shadow p-4">
            <div className="font-semibold text-lg">{p.name}</div>
            <div className="text-gray-500 text-sm mb-2">{p.description}</div>
            {/* 可扩展：项目状态、成员、操作按钮等 */}
          </div>
        )) : (
          <div className="col-span-2 text-gray-400">暂无项目</div>
        )}
      </div>
    </div>
  );
}

ProjectsPage.getLayout = function getLayout(page) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ProjectsPage;
