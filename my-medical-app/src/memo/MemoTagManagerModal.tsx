import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import MemoTagManager from './MemoTagManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoTagManagerModal({ isOpen, onClose }: Props) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg bg-white rounded p-6 shadow">
            <MemoTagManager />
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={onClose}>
                閉じる
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
