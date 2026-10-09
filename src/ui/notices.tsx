import { useAppDispatch, useAppSelector } from "../store/store";
import { noticeDismissed } from "../store/ui-slice";
import { Toast, ToastViewport } from "./design/toast";

const Notices = () => {
  const dispatch = useAppDispatch();
  const notices = useAppSelector((s) => s.ui.notices);
  return (
    <>
      {notices.map((n) => (
        <Toast key={n.id} tone={n.kind} onClose={() => dispatch(noticeDismissed(n.id))}>
          {n.text}
        </Toast>
      ))}
      <ToastViewport />
    </>
  );
};

export { Notices };
