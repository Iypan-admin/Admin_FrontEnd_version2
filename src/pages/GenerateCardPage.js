import React from "react";
import Navbar from "../components/Navbar";

const GenerateCardPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            <Navbar />
            <div className="flex-1 lg:ml-64">
                <div className="p-2 sm:p-4 lg:p-8">
                    <div className="mt-16 lg:mt-0">
                        {/* Page Title */}
                        <div className="max-w-7xl mx-auto mb-6">
                            <div className="flex items-center space-x-4">
                                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Generate Card</h1>
                            </div>
                        </div>

                        {/* Zoho Form Full Width with Rounded Corners */}
                        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <iframe
                                src="https://forms.zohopublic.in/durkkas/form/ISMLCardForm/formperma/_IFVNxaVirxs5tHqWymD4bu6WXVcOsCYnELRwkDD75g"
                                style={{ width: "100%", height: "80vh", border: "1px solid #ccc" }}
                                title="Zoho ISML Card Form"
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerateCardPage;
