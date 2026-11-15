import { AdminSettings } from "@/features/admin/settings";
import { AdminAccountForm } from "@/features/admin/account";

export default function Page() {
  return (
    <div className="flex flex-col gap-10">
      <AdminSettings />
      <section
        aria-label="Your admin login"
        className="border-line bg-s1 max-w-[520px] rounded-[24px] border p-5"
      >
        <AdminAccountForm />
      </section>
    </div>
  );
}
