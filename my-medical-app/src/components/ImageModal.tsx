import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface Props {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt = '', isOpen, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const reset = () => {
    setScale(1);
    setRotate(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const zoomIn = () => setScale((s) => s + 0.1);
  const zoomOut = () => setScale((s) => Math.max(0.1, s - 0.1));

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[90]" onClose={handleClose}>
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded shadow relative p-4 w-[90vw] h-[90vh] flex flex-col">
            <button
              className="absolute top-1 right-1 text-xl leading-none"
              onClick={handleClose}
            >
              ×
            </button>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={src}
                alt={alt}
                className="h-full w-full object-contain"
                style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
              />
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={zoomIn}>
                +
              </button>
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={zoomOut}>
                -
              </button>
              <button
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => setRotate((r) => r - 90)}
              >
                ↺
              </button>
              <button
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => setRotate((r) => r + 90)}
              >
                ↻
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
