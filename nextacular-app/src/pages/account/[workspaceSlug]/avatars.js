import useSWR from 'swr';
import { useRouter } from 'next/router';
import { useState } from 'react';
import AccountLayout from '@/layouts/AccountLayout';

function AvatarsPage() {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data: avatars, error, isLoading } = useSWR('/api/xiaoice/avatars', {
    refreshInterval: 0,
  });

  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleAvatarClick = (avatar) => {
    setSelectedAvatar(avatar);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (selectedAvatar && workspaceSlug) {
      router.push(`/account/${workspaceSlug}/avatars/${selectedAvatar.id}/edit`);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedAvatar(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">数字人列表</h1>
      {isLoading && <div>加载中...</div>}
      {error && <div className="text-red-500">加载失败: {error.message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {avatars && avatars.length > 0 ? avatars.map(a => (
          <div
            key={a.id}
            className="bg-white rounded shadow p-4 flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-blue-400"
            onClick={() => handleAvatarClick(a)}
            title="点击新建项目"
          >
            <img src={a.thumbnail} alt={a.name} className="w-32 h-32 object-cover rounded mb-2" />
            <div className="font-semibold">{a.name}</div>
            <div className="text-gray-500 text-sm mb-2">{a.description}</div>
            <div className="text-xs text-gray-400">行业: {a.industry || '-'}</div>
            <div className="text-xs text-gray-400">语言: {a.language || '-'}</div>
          </div>
        )) : (
          <div className="col-span-3 text-gray-400">暂无数字人</div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-8 max-w-xs w-full">
            <div className="font-bold text-lg mb-4">新建项目确认</div>
            <div className="mb-6">是否要以“{selectedAvatar?.name}”为基础新建一个项目？</div>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={handleCancel}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleConfirm}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AvatarsPage.getLayout = function getLayout(page) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default AvatarsPage;
