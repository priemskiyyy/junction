import type React from "react";

import { PEOPLE, PERSON_IDS } from "example-shared/folio/constants/people";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { Monogram } from "src/components/Common/Monogram";
import { FolioMark } from "src/components/Folio/FolioMark";
import { useRuntime } from "src/hooks/useRuntime";

export const SignInScreen: React.FunctionComponent = () => {
  const { app } = useRuntime();

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pt-6">
      <FolioMark />
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">
          Sign in to Folio
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Anything that opened Folio meanwhile waits in Junction&apos;s inbox
          for someone to sign in.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {PERSON_IDS.map((id) => {
          const person = PEOPLE[id];

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => app.signIn(id)}
                className={buttonStyles({ size: "block" })}
              >
                <Monogram text={person.initials} tone={person.tone} />
                <span className="flex flex-col">
                  <span>Continue as {person.firstName}</span>
                  <span className="text-xs font-normal text-zinc-500">
                    {person.role}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
