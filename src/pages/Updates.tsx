import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Check, CheckCheck, ChevronDown, Trash2 } from "lucide-react";

function Updates() {
  const [updates, setUpdates] = useState<unknown>([]);
  const [submitted, setSubmitted] = useState(false);
  let [updateval, setupdateval] = useState<string[]>([]);
  let [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: unknown) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("Updates")
      .insert([{ description: updateval }])
      .select("*");

    if (error) {
      console.error("Insert error:", error);
    } else {
      console.log("Updates inserted:");
      setSubmitted(true);
      console.log(data[0]);
      setUpdates((prevUpdates: unknown) => [...prevUpdates, data[0]]);

      setupdateval("");
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    }
  }

  async function fetchupdates() {
    const { data, error } = await supabase
      .from("Updates") // Replace with your table name
      .select("*"); // Fetches all columns

    if (error) {
      console.error("Fetch error:", error);
    } else {
      const sortedUpdates = [...data].sort((a: any, b: any) => {
        return (b.selected === true ? 1 : 0) - (a.selected === true ? 1 : 0);
      });
      setUpdates(sortedUpdates);

      console.log("Fetched data:", data);
    }
  }

  useEffect(() => {
    fetchupdates();
  }, []);

  async function handledelete(id: number) {
    const { data, error } = await supabase
      .from("Updates")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Delete error:", error);
    } else {
      console.log("Update deleted:", data);
      fetchupdates();
    }
  }
  async function handleselect(id: number) {
    const { data, error } = await supabase
      .from("Updates")
      .update({ selected: false })
      .eq("selected", true);
    if (error) {
      console.error("Update error:", error);
    }
    const { error: seconderror } = await supabase
      .from("Updates")
      .update({ selected: true })
      .eq("id", id);
    if (seconderror) {
      console.error("Update error:", error);
    }
    fetchupdates();
  }

  return (
    <div>
      <h2 className="text-[28px] leading-9 text-[#000000] font-bold mb-4">
        Office Alerts
      </h2>
      <div className="p-6 bg-white rounded-[10px] shadow-lg mb-6">
        <h2 className="text-[22px] leading-7 text-[#000000] font-semibold mb-4">
          Brifely Describe the Office alert
        </h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={updateval}
            rows={6}
            onChange={(e) => setupdateval(e.target.value)}
            className="w-full border border-gray-300 rounded-[10px] p-2 mb-4 outline-none"
            placeholder="Write your Alert here..."
            required
          ></textarea>
          {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="w-[179px] h-[45px] px-4 py-2 bg-[#9A00FF] text-white rounded-[10px] hover:bg-blue-700"
            >
              Submit Alert
            </button>
          </div>
        </form>
        {submitted && (
          <p className="text-green-600 mt-4">Alert submitted successfully!</p>
        )}
        <h1 className="text-2xl font-bold font-mono">All Office Alerts</h1>
        <div className="flex justify-center gap-0  mt-4 flex-wrap">
          {updates?.length != 0 ? (
            updates.map((update) => (
              <div className="max-w-sm mx-2 mt-5 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <p className="text-gray-700">{update.description}</p>
                  </div>

                  <div className="flex flex-col self-baseline sm:flex-row gap-2 mt-4">
                    <button
                      aria-details="Check the alert"
                      disabled={update.selected}
                      onClick={() => handleselect(update.id)}
                      className={` hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors ${
                        update.selected
                          ? "bg-blue-700 cursor-not-allowed hover:bg-blue-500"
                          : "bg-green-700"
                      }`}
                    >
                      {update.selected ? <CheckCheck /> : <Check />}
                    </button>
                    <button
                      aria-details="Delete the alert"
                      disabled={update.selected}
                      onClick={() => handledelete(update.id)}
                      className="bg-red-400 hover:bg-red-500 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span>No update available</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Updates;
