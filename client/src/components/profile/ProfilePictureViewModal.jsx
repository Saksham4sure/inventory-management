import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Download,
  Edit3,
  Upload,
  Trash2,
  User,
  ShieldCheck,
} from 'lucide-react';

export const ProfilePictureViewModal = ({
  isOpen,
  onClose,
  user,
  onEdit,
  onChangeImage,
  onRemove,
}) => {
  const imageUrl = user?.profilePicture || user?.avatar;

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${(user?.name || 'profile').toLowerCase().replace(/\s+/g, '_')}_profile.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Picture"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Full Image Display */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-inner aspect-square max-h-[380px] w-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={user?.name || 'User Profile'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 gap-2">
              <User className="w-16 h-16 opacity-40" />
              <p className="text-xs">No profile picture uploaded</p>
            </div>
          )}
        </div>

        {/* User Card Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-zinc-900/10 dark:ring-white/10 shrink-0 bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {user?.name || 'User'}
                </span>
                {user?.kyc?.status === 'VERIFIED' && (
                  <span
                    title="KYC Verified"
                    className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          <Badge variant="accent">{user?.role || 'OWNER'}</Badge>
        </div>

        {/* Symmetrical Action Buttons Toolbar */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
          {imageUrl ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {onEdit && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onEdit();
                  }}
                  className="w-full justify-center rounded-xl text-xs py-2.5 font-medium shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  Edit
                </Button>
              )}

              {onChangeImage && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onClose();
                    onChangeImage();
                  }}
                  className="w-full justify-center rounded-xl text-xs py-2.5 font-medium"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  Change
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={handleDownload}
                className="w-full justify-center rounded-xl text-xs py-2.5 font-medium"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Download
              </Button>

              {onRemove && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    onClose();
                    onRemove();
                  }}
                  className="w-full justify-center rounded-xl text-xs py-2.5 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  Remove
                </Button>
              )}
            </div>
          ) : (
            onChangeImage && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  onClose();
                  onChangeImage();
                }}
                className="w-full justify-center rounded-xl text-xs py-2.5 font-medium shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Upload Profile Picture
              </Button>
            )
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfilePictureViewModal;
