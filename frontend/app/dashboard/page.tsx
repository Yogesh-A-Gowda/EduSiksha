export default function DashboardHome() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-gray-800 p-8 rounded-full mb-6 animate-pulse">
                <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-400 text-transparent bg-clip-text mb-4">Select a Kid to View Details</h2>
            <p className="text-gray-400 max-w-lg">
                Click on a child's name in the sidebar to view their chat history, monitor their progress, and generate practice papers.
            </p>
        </div>
    );
}
