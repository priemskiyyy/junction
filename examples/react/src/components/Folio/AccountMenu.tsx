import { SignOut, UserSwitch } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";

import { PEOPLE, PERSON_IDS } from "example-shared/folio/constants/people";
import { isPersonId } from "example-shared/folio/isPersonId";
import { Monogram } from "src/components/Common/Monogram";
import { useRuntime } from "src/hooks/useRuntime";

type AccountMenuProps = { account: { id: string } };

export const AccountMenu: React.FunctionComponent<AccountMenuProps> = ({
  account,
}) => {
  const { app } = useRuntime();
  const [open, setOpen] = useState(false);

  if (!isPersonId(account.id)) {
    return null;
  }

  const person = PEOPLE[account.id];
  const others = PERSON_IDS.filter((id) => id !== account.id);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Signed in as ${person.firstName}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        <Monogram text={person.initials} tone={person.tone} shape="round" />
      </button>
      {open ? (
        <ul
          aria-label="Account"
          className="absolute top-11 right-0 z-10 flex w-48 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-lg motion-safe:animate-land dark:border-zinc-700 dark:bg-zinc-900"
        >
          {others.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  app.signIn(id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-zinc-800"
              >
                <UserSwitch aria-hidden="true" size={16} weight="bold" />
                Switch to {PEOPLE[id].firstName}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                app.signOut();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-zinc-800"
            >
              <SignOut aria-hidden="true" size={16} weight="bold" />
              Sign out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
};
