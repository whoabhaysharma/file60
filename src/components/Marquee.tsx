import React from 'react';

const Marquee: React.FC = () => {
  return (
    <div className="bg-black text-white border-b-[3px] border-black py-2 overflow-hidden whitespace-nowrap flex-shrink-0 select-none">
      <div className="inline-block animate-scroll font-bold uppercase text-sm">
        FILE60 // SECURE MEDIA DROP // ALL FILE SUPPORT // 60 MINUTE SELF-DESTRUCT // VISUAL PREVIEWS // NO LOGS // GET IN. GET OUT. //
        FILE60 // SECURE MEDIA DROP // ALL FILE SUPPORT // 60 MINUTE SELF-DESTRUCT // VISUAL PREVIEWS // NO LOGS // GET IN. GET OUT. //
        FILE60 // SECURE MEDIA DROP // ALL FILE SUPPORT // 60 MINUTE SELF-DESTRUCT // VISUAL PREVIEWS // NO LOGS // GET IN. GET OUT. //
      </div>
    </div>
  );
};

export default Marquee;
