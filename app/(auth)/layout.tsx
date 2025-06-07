import React from "react";
import Image from "next/image";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <section className="hidden w-1/2 items-center justify-center bg-brand p-10 lg:flex xl:w-2/5">
        <div className="flex max-h-[800px] max-w-[430px] flex-col justify-center space-y-12">
          <Image
            src="/assets/icons/logo-new.svg"
            alt="logo"
            width={224}
            height={82}
            className="h-auto"
          />

          <div className="space-y-5 text-white">
            <h1 className="h1">Where your files feel safe</h1>
            <p className="body-1">
              This is a place where you can store all your documents.
            </p>
          </div>
          <Image
            src="/assets/images/files.png"
            alt="Files"
            width={342}
            height={342}
            className="transition-all hover:rotate-2 hover:scale-105"
          />
        </div>
      </section>      <section className="flex flex-1 flex-col items-center bg-white p-4 py-10 lg:justify-center lg:p-10 lg:py-0">
        <div className="mb-16 flex flex-col items-center lg:hidden">
          <div className="flex justify-center">
            <Image
              src="/assets/icons/logo-full-brand-new.svg"
              alt="logo"
              width={224}
              height={82}
              className="h-auto w-[200px] lg:w-[250px]"
            />
          </div>
          <div className="mt-6 flex max-w-[280px] flex-col items-center space-y-2">
            <h1 className="h3 text-brand">Where your files feel safe</h1>
            <p className="body-2 text-center text-light-100">
              This is a place where you can store all your documents.
            </p>
          </div>
        </div>

        {children}
      </section>
    </div>
  );
};

export default Layout;
