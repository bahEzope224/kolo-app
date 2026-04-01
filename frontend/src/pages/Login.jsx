import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";

export default function Login() {
  const [mode, setMode] = useState("login");

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="bg-emerald-600 px-8 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">🌿</div>
          <h1 className="text-white font-black text-2xl">Kolo</h1>
          <p className="text-emerald-100 text-sm mt-1">Tontine collective simplifiée</p>
        </div>

        <div className="flex border-b border-slate-100">
          {[["login", "Connexion"], ["register", "Créer un compte"]].map(([m, label]) => (
            <button key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-4 text-sm font-bold transition min-h-0 border-none rounded-none ${
                mode === m ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50" : "text-slate-400 bg-white"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 flex justify-center">
          {mode === "login" ? (
            <SignIn 
              routing="hash" 
              signUpUrl="/register"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-sm normal-case",
                  card: "shadow-none border-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "border-slate-200 text-slate-600 hover:bg-slate-50",
                  formFieldInput: "border-slate-200 focus:border-emerald-400 focus:ring-emerald-400",
                  footerActionLink: "text-emerald-600 hover:text-emerald-700"
                }
              }}
            />
          ) : (
            <SignUp 
              routing="hash" 
              signInUrl="/login"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-sm normal-case",
                  card: "shadow-none border-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "border-slate-200 text-slate-600 hover:bg-slate-50",
                  formFieldInput: "border-slate-200 focus:border-emerald-400 focus:ring-emerald-400",
                  footerActionLink: "text-emerald-600 hover:text-emerald-700"
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}